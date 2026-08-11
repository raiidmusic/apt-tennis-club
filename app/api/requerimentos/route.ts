import { requireAdmin } from "../../../lib/auth";
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
type InviteApplication = { id: string; name: string; email: string };

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
  const currentEnv = runtimeEnv();
  const apiKey = currentEnv.RESEND_API_KEY;
  const to = currentEnv.APT_APPLICATION_TO_EMAIL;
  const from = currentEnv.APT_RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) return "not_configured";
  const lines = Object.entries(answers).map(([key, value]) => `${labels[key] || key}: ${valueAsText(value)}`);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `apt-application-${id}` },
    body: JSON.stringify({
      from, to: [to], reply_to: valueAsText(answers.email),
      subject: `Novo requerimento APT — ${valueAsText(answers.nome)}`,
      text: `Um novo requerimento foi enviado ao APT Tennis Club.\n\n${lines.join("\n")}\n\nIdentificador: ${id}`,
      tags: [{ name: "flow", value: "apt_application" }],
    }),
  });
  return response.ok ? "sent" : "failed";
}

async function sendInviteEmail(application: InviteApplication, inviteToken: string, inviteId: string) {
  const currentEnv = runtimeEnv();
  const apiKey = currentEnv.RESEND_API_KEY;
  const to = currentEnv.APT_APPLICATION_TO_EMAIL;
  const from = currentEnv.APT_RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) return "not_configured";
  const origin = currentEnv.APT_PUBLIC_URL?.replace(/\/$/, "");
  if (!origin) return "not_configured";
  const inviteUrl = `${origin}/cadastro?convite=${encodeURIComponent(inviteToken)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `apt-invite-${inviteId}` },
    body: JSON.stringify({
      from, to: [application.email], reply_to: to,
      subject: "Seu cadastro APT foi aprovado",
      text: `Olá, ${application.name}.\n\nSeu requerimento foi aprovado. Conclua seu cadastro e sua assinatura pelo link privado:\n${inviteUrl}\n\nO link expira em 7 dias.`,
      tags: [{ name: "flow", value: "apt_invite" }],
    }),
  });
  return response.ok ? "sent" : "failed";
}

async function registerFormSubmission(applicationId: string, answers: Record<string, AnswerValue>) {
  try {
    const forms = await supabaseAdmin<Array<{ id: string }>>("forms", {
      query: { select: "id", slug: "eq.requerimento-de-entrada", limit: "1" },
    });
    if (!forms[0]) return "form_not_found";
    const versions = await supabaseAdmin<Array<{ id: string }>>("form_versions", {
      query: { select: "id", form_id: `eq.${forms[0].id}`, status: "eq.published", order: "version_number.desc", limit: "1" },
    });
    if (!versions[0]) return "version_not_found";
    await supabaseAdmin("form_submissions", {
      method: "POST",
      query: { on_conflict: "application_id" },
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: { form_version_id: versions[0].id, application_id: applicationId, answers },
    });
    return "recorded";
  } catch {
    // The application remains canonical while the incremental form migration is being deployed.
    return "unavailable";
  }
}

export async function POST(request: Request) {
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
    const emailStatus = await sendApplicationEmail(id, answers).catch(() => "failed");
    await supabaseAdmin("applications", {
      method: "PATCH", query: { id: `eq.${id}` }, body: { email_status: emailStatus, updated_at: new Date().toISOString() },
    });
    const [formSubmissionStatus, auditStatus] = await Promise.all([
      registerFormSubmission(id, answers),
      supabaseAdmin("audit_logs", {
        method: "POST",
        body: { actor: email, action: "application.submitted", entity_type: "application", entity_id: id, metadata: { consent: true } },
      }).then(() => "recorded").catch(() => "unavailable"),
    ]);
    return Response.json({ id, status: "new", emailStatus, formSubmissionStatus, auditStatus }, { status: 201 });
  } catch (error) {
    const unavailable = error instanceof SupabaseRequestError && error.status === 503;
    return Response.json({ error: unavailable ? "A base do APT ainda está sendo conectada ao Supabase." : "Não foi possível registrar o requerimento." }, { status: unavailable ? 503 : 500 });
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const rows = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
      query: { select: "id,name,email,whatsapp,city,class_level,referrer,status,created_at", order: "created_at.desc", limit: "100" },
    });
    return Response.json({ applications: rows.map((row) => toApplication(row)) });
  } catch {
    return Response.json({ applications: [] });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: string; status?: ApplicationStatus };
    const allowed = new Set<ApplicationStatus>(["in_review", "awaiting_info", "approved", "rejected", "invite_sent"]);
    if (!payload.id || !payload.status || !allowed.has(payload.status)) {
      return Response.json({ error: "Decisão inválida." }, { status: 400 });
    }

    let inviteToken: string | undefined;
    let finalStatus: ApplicationStatus = payload.status;
    let inviteDelivery: "sent" | "manual" | undefined;
    if (payload.status === "approved") {
      inviteToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
      const tokenHash = await sha256(inviteToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin("invites", {
        method: "PATCH",
        query: { application_id: `eq.${payload.id}`, used_at: "is.null", revoked_at: "is.null" },
        body: { revoked_at: new Date().toISOString() },
      });
      const insertedInvites = await supabaseAdmin<Array<{ id: string }>>("invites", {
        method: "POST", prefer: "return=representation",
        body: { application_id: payload.id, token_hash: tokenHash, expires_at: expiresAt },
      });
      const inviteId = insertedInvites[0]?.id;
      if (!inviteId) return Response.json({ error: "Não foi possível gerar o convite." }, { status: 500 });
      const application = (await supabaseAdmin<InviteApplication[]>("applications", {
        query: { select: "id,name,email", id: `eq.${payload.id}`, limit: "1" },
      }))[0];
      const emailSent = application
        ? await sendInviteEmail(application, inviteToken, inviteId).catch(() => "failed") === "sent"
        : false;
      inviteDelivery = emailSent ? "sent" : "manual";
      finalStatus = inviteDelivery === "sent" ? "invite_sent" : "approved";
    }

    const rows = await supabaseAdmin<Array<Record<string, unknown>>>("applications", {
      method: "PATCH", query: { id: `eq.${payload.id}` }, prefer: "return=representation",
      body: { status: finalStatus, updated_at: new Date().toISOString() },
    });
    if (!rows[0]) return Response.json({ error: "Requerimento não encontrado." }, { status: 404 });
    await supabaseAdmin("audit_logs", {
      method: "POST", body: { actor: admin.email, action: `application.${finalStatus}`, entity_type: "application", entity_id: payload.id, metadata: { invite_delivery: inviteDelivery } },
    });
    return Response.json({ application: toApplication(rows[0], inviteToken), inviteDelivery });
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    return Response.json({ error: "Não foi possível atualizar o requerimento." }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
