import { requireAdmin } from "../../../lib/auth";
import { managementReplyTo, sendManagementEmail, sendMemberEmail } from "../../../lib/apt-email";
import { requireTrustedOrigin } from "../../../lib/request-security";
import { runtimeEnv, sha256, supabaseAdmin, SupabaseRequestError } from "../../../lib/supabase-server";

const labels: Record<string, string> = {
  nome: "Nome completo", email: "E-mail", whatsapp: "WhatsApp", idade: "Idade",
  cidade: "Cidade e bairro", profissao: "Profissão", onde_joga: "Onde joga",
  socio: "É sócio de clube", clube: "Clube", classe: "Classe", tempo: "Tempo de tênis",
  nivel: "Momento no jogo", atracao: "O que chamou atenção", tenis: "Como o tênis entra na vida",
  comunidade: "O que busca em uma comunidade", indicacao: "Quem indicou",
  agora: "Por que faz sentido agora",
  consent: "Consentimento",
};

const allowedAnswerKeys = new Set(Object.keys(labels));
const allowedChoices: Record<string, Set<string>> = {
  socio: new Set(["Sim", "Não"]),
  classe: new Set([
    "5ª classe — construindo base técnica", "4ª classe — regularidade e leitura de jogo",
    "3ª classe — controle, ritmo e competitividade", "2ª classe — ritmo alto e consistência",
    "1ª classe — técnica refinada e estratégia",
  ]),
  tempo: new Set(["Menos de 1 ano", "Entre 1 e 3 anos", "Mais de 3 anos", "Voltei recentemente"]),
  nivel: new Set(["Recreativo com frequência", "Competitivo casual", "Treino regular com foco em evolução", "Alto rendimento ou torneios"]),
  atracao: new Set(["A curadoria dos membros", "O estilo de vida ao redor do jogo", "O nível técnico e o formato", "As conexões e o networking", "A sensação de pertencer", "A estética e a experiência"]),
  tenis: new Set(["Um esporte", "Um ritual", "Um meio de conexão", "Equilíbrio entre mente e corpo", "Um espaço de performance"]),
  consent: new Set(["Sim, autorizo o uso para análise e contato"]),
};

type AnswerValue = string | string[];
type ApplicationStatus = "new" | "in_review" | "awaiting_info" | "approved" | "rejected" | "invite_sent";
type InviteApplication = { id: string; name: string; email: string; whatsapp: string };
type MemberInviteCandidate = { id: string; application_id: string | null; auth_user_id: string | null; participation_status: string };
type AdminNote = { id: string; body: string; created_by: string; created_at: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function valueAsText(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.join(", ") : String(value || "").trim();
}

function toApplication(row: Record<string, unknown>, inviteToken?: string) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    city: row.city,
    classLevel: row.class_level,
    referrer: row.referrer,
    status: row.status,
    createdAt: row.created_at,
    inviteToken,
  };
}

async function sendApplicationEmail(id: string, answers: Record<string, AnswerValue>) {
  const lines = Object.entries(answers).map(([key, value]) => `${labels[key] || key}: ${valueAsText(value)}`);
  return sendManagementEmail({
    replyTo: valueAsText(answers.email),
    subject: `Novo requerimento APT — ${valueAsText(answers.nome)}`,
    text: `Um novo requerimento foi enviado ao APT Tennis Club.\n\n${lines.join("\n")}\n\nIdentificador: ${id}`,
    flow: "application_management",
    idempotencyKey: `apt-application-management-${id}`,
  });
}

function sendApplicationReceipt(id: string, application: Pick<InviteApplication, "name" | "email">) {
  return sendMemberEmail({
    to: application.email,
    subject: "Recebemos seu requerimento APT",
    text: `Olá, ${application.name}.\n\nRecebemos seu requerimento para o APT Tennis Club. Nossa gestão analisará as informações e avisará você por este e-mail sobre os próximos passos.`,
    flow: "application_receipt",
    idempotencyKey: `apt-application-receipt-${id}`,
  });
}

async function sendInviteEmail(application: InviteApplication, inviteToken: string, inviteId: string) {
  const currentEnv = runtimeEnv();
  const origin = currentEnv.APT_PUBLIC_URL?.replace(/\/$/, "");
  if (!origin) return "not_configured";
  const inviteUrl = `${origin}/cadastro?convite=${encodeURIComponent(inviteToken)}`;
  return sendMemberEmail({
    to: application.email,
    replyTo: managementReplyTo(),
    subject: "Seu cadastro APT está liberado",
    text: `Olá, ${application.name}.\n\nSeu cadastro APT está liberado. Conclua seus dados e sua assinatura pelo link privado:\n${inviteUrl}\n\nO link expira em 7 dias.`,
    flow: "invite",
    idempotencyKey: `apt-invite-${inviteId}`,
  });
}

async function createPrivateInvite(target: { applicationId?: string; memberId?: string }) {
  if (!target.memberId && !target.applicationId) throw new SupabaseRequestError("Destino do convite ausente.", 500);
  const query: Record<string, string> = target.memberId ? { member_id: `eq.${target.memberId}` } : { application_id: `eq.${target.applicationId!}` };
  await supabaseAdmin("invites", {
    method: "PATCH",
    query: { ...query, used_at: "is.null", revoked_at: "is.null" },
    body: { revoked_at: new Date().toISOString() },
  });
  const inviteToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const inserted = await supabaseAdmin<Array<{ id: string }>>("invites", {
    method: "POST",
    prefer: "return=representation",
    body: {
      ...(target.applicationId ? { application_id: target.applicationId } : {}),
      ...(target.memberId ? { member_id: target.memberId } : {}),
      token_hash: await sha256(inviteToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  if (!inserted[0]?.id) throw new SupabaseRequestError("Não foi possível gerar o convite.", 500);
  return { inviteId: inserted[0].id, inviteToken };
}

async function findMemberByEmail(email: string) {
  return (await supabaseAdmin<MemberInviteCandidate[]>("members", {
    query: {
      select: "id,application_id,auth_user_id,participation_status",
      email: `eq.${email.toLowerCase()}`,
      limit: "1",
    },
  }))[0];
}

function pendingMemberForInvite(member: MemberInviteCandidate | undefined) {
  return member?.participation_status === "awaiting_payment" && !member.auth_user_id ? member : undefined;
}

function attachApplicationToMember(member: MemberInviteCandidate | undefined, applicationId: string) {
  if (!member || member.application_id) return Promise.resolve();
  return supabaseAdmin("members", {
    method: "PATCH",
    query: { id: `eq.${member.id}`, application_id: "is.null" },
    body: { application_id: applicationId, updated_at: new Date().toISOString() },
  });
}

async function issueInvite(application: InviteApplication, target: { applicationId?: string; memberId?: string }) {
  const { inviteId, inviteToken } = await createPrivateInvite(target);
  const emailStatus = await sendInviteEmail(application, inviteToken, inviteId);
  return { inviteToken, inviteDelivery: emailStatus === "sent" ? "sent" as const : "manual" as const, emailStatus };
}

export async function POST(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  try {
    const payload = await request.json() as { answers?: Record<string, AnswerValue>; consent?: boolean };
    const answers = payload.answers || {};
    const required = ["nome", "email", "whatsapp", "idade", "cidade", "profissao", "socio", "classe", "tempo", "nivel", "atracao", "tenis", "comunidade", "indicacao", "agora", "consent"];
    const answersAreValid = Object.entries(answers).every(([key, value]) =>
      allowedAnswerKeys.has(key) && valueAsText(value).length <= 1_200 &&
      (!Array.isArray(value) || (value.length <= 3 && value.every((item) => typeof item === "string" && item.length <= 200))),
    );
    const choicesAreValid = Object.entries(allowedChoices).every(([key, options]) => {
      const answer = answers[key];
      return Array.isArray(answer) ? answer.every((item) => options.has(item)) : options.has(String(answer || ""));
    });
    const email = valueAsText(answers.email).toLowerCase();
    const phone = valueAsText(answers.whatsapp).replace(/\D/g, "");
    const conditionalClubMissing = answers.socio === "Sim" && !valueAsText(answers.clube);
    if (!answersAreValid || !choicesAreValid || conditionalClubMissing || required.some((key) => !valueAsText(answers[key])) ||
      payload.consent !== true || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 10 || phone.length > 13) {
      return Response.json({ error: "Preencha todas as respostas obrigatórias." }, { status: 400 });
    }
    const age = Number(answers.idade);
    if (!Number.isInteger(age) || age < 25 || age > 45) {
      return Response.json({ error: "O requerimento está disponível para pessoas entre 25 e 45 anos." }, { status: 400 });
    }

    const rows = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
      method: "POST",
      prefer: "return=representation",
      body: {
        name: valueAsText(answers.nome), email,
        whatsapp: valueAsText(answers.whatsapp), age, city: valueAsText(answers.cidade),
        profession: valueAsText(answers.profissao), class_level: valueAsText(answers.classe),
        referrer: valueAsText(answers.indicacao), answers, consent_at: new Date().toISOString(), status: "new",
      },
    });
    const application = rows[0];
    const id = String(application.id);
    const applicationContact = { name: valueAsText(answers.nome), email };
    const [emailStatus, applicantEmailStatus] = await Promise.all([
      sendApplicationEmail(id, answers),
      sendApplicationReceipt(id, applicationContact),
    ]);
    await supabaseAdmin("applications", {
      method: "PATCH", query: { id: `eq.${id}` }, body: { email_status: emailStatus, updated_at: new Date().toISOString() },
    });
    const auditStatus = await supabaseAdmin("audit_logs", {
      method: "POST",
      body: { actor: email, action: "application.submitted", entity_type: "application", entity_id: id, metadata: { consent: true, management_email: emailStatus, applicant_email: applicantEmailStatus } },
    }).then(() => "recorded").catch(() => "unavailable");
    return Response.json({ id, status: "new", emailStatus, auditStatus }, { status: 201 });
  } catch (error) {
    const unavailable = error instanceof SupabaseRequestError && error.status === 503;
    return Response.json({ error: unavailable ? "A base do APT ainda está sendo conectada ao Supabase." : "Não foi possível registrar o requerimento." }, { status: unavailable ? 503 : 500 });
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const applicationId = new URL(request.url).searchParams.get("id");
    if (applicationId) {
      if (!uuidPattern.test(applicationId)) return Response.json({ error: "Requerimento inválido." }, { status: 400 });
      const [applications, notes] = await Promise.all([
        supabaseAdmin<Array<Record<string, unknown>>>("applications", {
          query: { select: "id,name,email,whatsapp,city,profession,class_level,referrer,answers,status,email_status,created_at", id: `eq.${applicationId}`, limit: "1" },
        }),
        supabaseAdmin<AdminNote[]>("admin_notes", {
          query: { select: "id,body,created_by,created_at", application_id: `eq.${applicationId}`, order: "created_at.asc" },
        }),
      ]);
      if (!applications[0]) return Response.json({ error: "Requerimento não encontrado." }, { status: 404 });
      const application = applications[0];
      return Response.json({ application: { ...toApplication(application), profession: application.profession, answers: application.answers || {}, emailStatus: application.email_status, notes } });
    }
    const rows = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
      query: { select: "id,name,email,whatsapp,city,class_level,referrer,status,created_at", order: "created_at.desc", limit: "100" },
    });
    return Response.json({ applications: rows.map((row) => toApplication(row)) });
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    return Response.json({ error: "Não foi possível carregar os requerimentos." }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}

export async function PATCH(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as {
      id?: string;
      status?: ApplicationStatus;
      note?: string;
      action?: "resend_invite" | "direct_invite";
      name?: string;
      email?: string;
      whatsapp?: string;
      consent?: boolean;
    };
    if (payload.action === "direct_invite") {
      const name = payload.name?.trim() || "";
      const email = payload.email?.trim().toLowerCase() || "";
      const whatsapp = payload.whatsapp?.replace(/\D/g, "") || "";
      if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.length < 10 || whatsapp.length > 13 || payload.consent !== true) {
        return Response.json({ error: "Informe nome, e-mail, WhatsApp e a autorização para envio." }, { status: 400 });
      }
      const existing = (await supabaseAdmin<Array<{ id: string }>>("applications", {
        query: { select: "id", email: `eq.${email}`, status: "in.(new,in_review,awaiting_info,approved,invite_sent)", limit: "1" },
      }))[0];
      if (existing) return Response.json({ error: "Já existe um convite ou análise em andamento para este e-mail." }, { status: 409 });
      const existingMember = await findMemberByEmail(email);
      const member = pendingMemberForInvite(existingMember);
      if (existingMember && !member) return Response.json({ error: "Este e-mail já pertence a um integrante com cadastro concluído." }, { status: 409 });
      const created = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
        method: "POST",
        prefer: "return=representation",
        body: {
          name, email, whatsapp, age: null, city: null, profession: null, class_level: null, referrer: null,
          answers: { nome: name, email, whatsapp, origem: "Convite direto da gestão", consent: "Contato autorizado pela gestão" },
          consent_at: new Date().toISOString(), status: "approved", email_status: "not_requested",
        },
      });
      const createdApplication = created[0];
      if (!createdApplication) return Response.json({ error: "Não foi possível preparar o convite direto." }, { status: 500 });
      const application = { id: String(createdApplication.id), name, email, whatsapp };
      await attachApplicationToMember(member, application.id);
      const issued = await issueInvite(application, member ? { memberId: member.id } : { applicationId: application.id });
      const finalStatus = issued.inviteDelivery === "sent" ? "invite_sent" : "approved";
      const rows = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
        method: "PATCH", query: { id: `eq.${application.id}` }, prefer: "return=representation",
        body: { status: finalStatus, email_status: issued.emailStatus, updated_at: new Date().toISOString() },
      });
      await supabaseAdmin("audit_logs", {
        method: "POST",
        body: { actor: admin.email, action: "application.direct_invite_created", entity_type: "application", entity_id: application.id, metadata: { invite_delivery: issued.inviteDelivery, member_targeted: Boolean(member) } },
      });
      return Response.json({ application: toApplication(rows[0], issued.inviteToken), inviteDelivery: issued.inviteDelivery, emailStatus: issued.emailStatus });
    }

    if (payload.action === "resend_invite") {
      if (!payload.id || !uuidPattern.test(payload.id)) return Response.json({ error: "Requerimento inválido." }, { status: 400 });
      const application = (await supabaseAdmin<InviteApplication[]>("applications", {
        query: { select: "id,name,email,whatsapp", id: `eq.${payload.id}`, status: "in.(approved,invite_sent)", limit: "1" },
      }))[0];
      if (!application) return Response.json({ error: "Este convite não está disponível para reenvio." }, { status: 409 });
      const existingMember = await findMemberByEmail(application.email);
      const member = pendingMemberForInvite(existingMember);
      if (existingMember && !member) return Response.json({ error: "Este e-mail já pertence a um integrante com cadastro concluído." }, { status: 409 });
      await attachApplicationToMember(member, application.id);
      const issued = await issueInvite(application, member ? { memberId: member.id } : { applicationId: application.id });
      const finalStatus = issued.inviteDelivery === "sent" ? "invite_sent" : "approved";
      const rows = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
        method: "PATCH", query: { id: `eq.${application.id}` }, prefer: "return=representation",
        body: { status: finalStatus, email_status: issued.emailStatus, updated_at: new Date().toISOString() },
      });
      await supabaseAdmin("audit_logs", {
        method: "POST",
        body: { actor: admin.email, action: "application.invite_resent", entity_type: "application", entity_id: application.id, metadata: { invite_delivery: issued.inviteDelivery, member_targeted: Boolean(member) } },
      });
      return Response.json({ application: toApplication(rows[0], issued.inviteToken), inviteDelivery: issued.inviteDelivery, emailStatus: issued.emailStatus });
    }

    const allowed = new Set<ApplicationStatus>(["new", "in_review", "awaiting_info", "approved", "rejected", "invite_sent"]);
    const note = payload.note?.trim() || "";
    if (!payload.id || !uuidPattern.test(payload.id) || (payload.status && !allowed.has(payload.status)) || (!payload.status && !note) || note.length > 1_200 || (payload.status === "awaiting_info" && !note)) {
      return Response.json({ error: "Decisão inválida." }, { status: 400 });
    }

    let inviteToken: string | undefined;
    let inviteApplication: InviteApplication | undefined;
    let inviteMember: MemberInviteCandidate | undefined;
    let finalStatus: ApplicationStatus | undefined = payload.status;
    let inviteDelivery: "sent" | "manual" | undefined;
    if (payload.status === "approved") {
      inviteApplication = (await supabaseAdmin<InviteApplication[]>("applications", {
        query: { select: "id,name,email,whatsapp", id: `eq.${payload.id}`, limit: "1" },
      }))[0];
      if (!inviteApplication) return Response.json({ error: "Requerimento não encontrado." }, { status: 404 });
      const existingMember = await findMemberByEmail(inviteApplication.email);
      inviteMember = pendingMemberForInvite(existingMember);
      if (existingMember && !inviteMember) return Response.json({ error: "Este e-mail já pertence a um integrante com cadastro concluído." }, { status: 409 });
      finalStatus = "approved";
    }

    let savedNote: AdminNote | undefined;
    // A request for more information must never be shown without the internal
    // record that explains what the team still has to request.
    if (note && payload.status === "awaiting_info") {
      savedNote = (await supabaseAdmin<AdminNote[]>("admin_notes", {
        method: "POST", prefer: "return=representation",
        body: { application_id: payload.id, body: note, created_by: admin.email },
      }))[0];
    }
    let rows = finalStatus
      ? await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
        method: "PATCH", query: { id: `eq.${payload.id}`, ...(payload.status === "approved" ? { status: "in.(new,in_review,awaiting_info,rejected)" } : {}) }, prefer: "return=representation",
        body: { status: finalStatus, updated_at: new Date().toISOString() },
      })
      : await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
        query: { select: "id,name,email,whatsapp,city,class_level,referrer,status,created_at", id: `eq.${payload.id}`, limit: "1" },
      });
    if (!rows[0]) return Response.json({ error: "Requerimento não encontrado." }, { status: 404 });
    savedNote = savedNote || (note
      ? (await supabaseAdmin<AdminNote[]>("admin_notes", {
        method: "POST", prefer: "return=representation",
        body: { application_id: payload.id, body: note, created_by: admin.email },
      }))[0]
      : undefined);
    let decisionEmail: string | undefined;
    if (payload.status === "approved" && inviteApplication) {
      await attachApplicationToMember(inviteMember, inviteApplication.id);
      const issued = await issueInvite(inviteApplication, inviteMember ? { memberId: inviteMember.id } : { applicationId: inviteApplication.id });
      inviteToken = issued.inviteToken;
      inviteDelivery = issued.inviteDelivery;
      decisionEmail = inviteDelivery;
      finalStatus = inviteDelivery === "sent" ? "invite_sent" : "approved";
      rows = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
        method: "PATCH", query: { id: `eq.${payload.id}` }, prefer: "return=representation",
        body: { status: finalStatus, email_status: issued.emailStatus, updated_at: new Date().toISOString() },
      });
    }
    if (payload.status === "rejected") {
      const application = rows[0] as { name?: unknown; email?: unknown };
      if (typeof application.name === "string" && typeof application.email === "string") {
        decisionEmail = await sendMemberEmail({
          to: application.email,
          subject: "Atualização sobre seu requerimento APT",
          text: `Olá, ${application.name}.\n\nAgradecemos seu interesse no APT Tennis Club. Neste momento, não seguiremos com o requerimento.`,
          flow: "application_rejected",
          idempotencyKey: `apt-application-rejected-${payload.id}`,
        });
      }
    }
    await supabaseAdmin("audit_logs", {
      method: "POST", body: { actor: admin.email, action: finalStatus ? `application.${finalStatus}` : "application.note_added", entity_type: "application", entity_id: payload.id, metadata: { invite_delivery: inviteDelivery, decision_email: decisionEmail, note_recorded: Boolean(savedNote) } },
    });
    return Response.json({ application: toApplication(rows[0], inviteToken), inviteDelivery, emailStatus: decisionEmail === "sent" ? "sent" : decisionEmail === "manual" ? "failed" : undefined, note: savedNote });
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    return Response.json({ error: "Não foi possível atualizar o requerimento." }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
