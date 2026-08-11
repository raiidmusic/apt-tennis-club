import { asaasCheckoutUrl, asaasRequest } from "../../../lib/asaas";
import { isValidCpf } from "../../../lib/cpf";
import { createAuthUser, deleteAuthUser, runtimeEnv, sha256, supabaseAdmin, SupabaseRequestError } from "../../../lib/supabase-server";

type InviteRow = {
  id: string;
  application_id: string | null;
  member_id: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};
type ApplicationRow = { id: string; name: string; email: string; whatsapp: string; class_level: string; status: string };
type MemberRow = {
  id: string;
  application_id: string | null;
  auth_user_id: string | null;
  name: string;
  email: string;
  whatsapp: string;
  cpf_hash: string | null;
  participation_status: string;
};
type SubscriptionRow = {
  id: string;
  asaas_checkout_id: string | null;
  asaas_checkout_url: string | null;
  checkout_attempted_at: string | null;
};

async function findInvite(inviteToken: string) {
  const inviteHash = await sha256(inviteToken);
  const invites = await supabaseAdmin<InviteRow[]>("invites", {
    query: {
      select: "id,application_id,member_id,expires_at,used_at,revoked_at",
      token_hash: `eq.${inviteHash}`,
      revoked_at: "is.null",
      limit: "1",
    },
  });
  const invite = invites[0];
  if (!invite || new Date(invite.expires_at).getTime() <= Date.now()) return null;
  return invite;
}

async function findMember(id: string) {
  return (await supabaseAdmin<MemberRow[]>("members", {
    query: {
      select: "id,application_id,auth_user_id,name,email,whatsapp,cpf_hash,participation_status",
      id: `eq.${id}`,
      limit: "1",
    },
  }))[0];
}

export async function GET(request: Request) {
  try {
    const inviteToken = new URL(request.url).searchParams.get("convite")?.trim() || "";
    if (!inviteToken) return Response.json({ error: "Convite ausente." }, { status: 400 });
    const invite = await findInvite(inviteToken);
    if (!invite) return Response.json({ error: "Este convite não é válido ou já expirou." }, { status: 403 });

    const configuredMonthlyValue = Number(runtimeEnv().ASAAS_MONTHLY_VALUE);
    const monthlyValue = Number.isFinite(configuredMonthlyValue) && configuredMonthlyValue > 0 ? configuredMonthlyValue : null;
    if (invite.member_id) {
      const member = await findMember(invite.member_id);
      if (!member) return Response.json({ error: "Atleta não encontrado." }, { status: 404 });
      const subscription = (await supabaseAdmin<SubscriptionRow[]>("subscriptions", {
        query: { select: "id,asaas_checkout_id,asaas_checkout_url,checkout_attempted_at", member_id: `eq.${member.id}`, limit: "1" },
      }))[0];
      return Response.json({
        name: member.name,
        email: member.email,
        phone: member.whatsapp,
        recadastro: true,
        monthlyValue,
        completed: Boolean(member.cpf_hash && member.auth_user_id),
        checkoutUrl: subscription?.asaas_checkout_url || (subscription?.asaas_checkout_id ? asaasCheckoutUrl(subscription.asaas_checkout_id) : null),
      });
    }

    const application = (await supabaseAdmin<ApplicationRow[]>("applications", {
      query: { select: "id,name,email,whatsapp,class_level,status", id: `eq.${invite.application_id}`, limit: "1" },
    }))[0];
    if (!application || !["approved", "invite_sent"].includes(application.status)) {
      return Response.json({ error: "Este requerimento não está liberado para cadastro." }, { status: 403 });
    }
    return Response.json({ name: application.name, email: application.email, phone: application.whatsapp, recadastro: false, monthlyValue });
  } catch {
    return Response.json({ error: "Não foi possível validar o convite." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      inviteToken?: string;
      name?: string;
      cpf?: string;
      email?: string;
      phone?: string;
      password?: string;
      consent?: boolean;
    };
    const inviteToken = payload.inviteToken?.trim() || "";
    const name = payload.name?.trim() || "";
    const cpf = payload.cpf?.replace(/\D/g, "") || "";
    const email = payload.email?.trim().toLowerCase() || "";
    const phone = payload.phone?.replace(/\D/g, "") || "";
    const password = payload.password || "";
    if (!inviteToken || !name || !isValidCpf(cpf) || !email || phone.length < 10 || phone.length > 13 || password.length < 8 || payload.consent !== true) {
      return Response.json({ error: "Confira o convite, os dados e a senha de acesso." }, { status: 400 });
    }

    const invite = await findInvite(inviteToken);
    if (!invite) return Response.json({ error: "Este convite não é válido ou já expirou." }, { status: 403 });

    let application: ApplicationRow | undefined;
    let member = invite.member_id ? await findMember(invite.member_id) : undefined;
    if (invite.member_id) {
      if (!member) return Response.json({ error: "Atleta não encontrado." }, { status: 404 });
      if (email !== member.email.toLowerCase()) {
        return Response.json({ error: "Use o mesmo e-mail associado ao convite." }, { status: 409 });
      }
    } else {
      application = (await supabaseAdmin<ApplicationRow[]>("applications", {
        query: { select: "id,name,email,whatsapp,class_level,status", id: `eq.${invite.application_id}`, limit: "1" },
      }))[0];
      if (!application || !["approved", "invite_sent"].includes(application.status)) {
        return Response.json({ error: "Este requerimento não está liberado para cadastro." }, { status: 403 });
      }
    }

    const currentEnv = runtimeEnv();
    const cpfSecret = currentEnv.CPF_HASH_SECRET;
    const apiKey = currentEnv.ASAAS_API_KEY;
    const monthlyValue = Number(currentEnv.ASAAS_MONTHLY_VALUE);
    if (!cpfSecret) return Response.json({ error: "A proteção do CPF ainda está sendo configurada." }, { status: 503 });
    if (!apiKey || !Number.isFinite(monthlyValue) || monthlyValue <= 0) return Response.json({ error: "A cobrança do APT ainda está sendo configurada." }, { status: 503 });
    const cpfHash = await sha256(`${cpfSecret}:${cpf}`);

    const [sameEmail, sameCpf] = await Promise.all([
      supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,application_id,auth_user_id,name,email,whatsapp,cpf_hash,participation_status", email: `eq.${email}`, limit: "1" },
      }),
      supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,application_id,auth_user_id,name,email,whatsapp,cpf_hash,participation_status", cpf_hash: `eq.${cpfHash}`, limit: "1" },
      }),
    ]);

    if (member) {
      if ((sameEmail[0] && sameEmail[0].id !== member.id) || (sameCpf[0] && sameCpf[0].id !== member.id)) {
        return Response.json({ error: "Já existe outro cadastro associado a este e-mail ou CPF." }, { status: 409 });
      }
      if (member.cpf_hash && member.cpf_hash !== cpfHash) {
        return Response.json({ error: "O CPF deste cadastro já foi confirmado." }, { status: 409 });
      }
      await supabaseAdmin("members", {
        method: "PATCH",
        query: { id: `eq.${member.id}` },
        body: { name, whatsapp: phone, cpf_hash: cpfHash, cpf_last4: cpf.slice(-4), updated_at: new Date().toISOString() },
      });
      member = { ...member, name, whatsapp: phone, cpf_hash: cpfHash };
    } else {
      const existingMember = sameEmail[0] || sameCpf[0];
      if (sameEmail[0] && sameCpf[0] && sameEmail[0].id !== sameCpf[0].id) {
        return Response.json({ error: "Já existe um cadastro associado a este e-mail ou CPF." }, { status: 409 });
      }
      if (existingMember && (existingMember.application_id !== application?.id || existingMember.participation_status !== "awaiting_payment")) {
        return Response.json({ error: "Já existe um cadastro associado a este e-mail ou CPF." }, { status: 409 });
      }
      member = existingMember;
    }

    const memberId = member?.id || crypto.randomUUID();
    if (!member) {
      const authUserId = await createAuthUser({ email, password, name, memberId });
      try {
        await supabaseAdmin("members", {
          method: "POST",
          body: {
            id: memberId,
            application_id: application?.id,
            auth_user_id: authUserId,
            name,
            email,
            whatsapp: phone,
            cpf_hash: cpfHash,
            cpf_last4: cpf.slice(-4),
            class_level: application?.class_level,
            participation_status: "awaiting_payment",
          },
        });
      } catch (error) {
        await deleteAuthUser(authUserId).catch(() => undefined);
        throw error;
      }
      member = await findMember(memberId);
    } else if (!member.auth_user_id) {
      const authUserId = await createAuthUser({ email, password, name, memberId });
      try {
        await supabaseAdmin("members", {
          method: "PATCH",
          query: { id: `eq.${memberId}`, auth_user_id: "is.null" },
          body: { auth_user_id: authUserId, updated_at: new Date().toISOString() },
        });
      } catch (error) {
        await deleteAuthUser(authUserId).catch(() => undefined);
        throw error;
      }
    }

    let subscription = (await supabaseAdmin<SubscriptionRow[]>("subscriptions", {
      query: { select: "id,asaas_checkout_id,asaas_checkout_url,checkout_attempted_at", member_id: `eq.${memberId}`, limit: "1" },
    }))[0];
    if (subscription?.asaas_checkout_id) {
      return Response.json({
        memberId,
        paymentConfigured: true,
        checkoutUrl: subscription.asaas_checkout_url || asaasCheckoutUrl(subscription.asaas_checkout_id),
      });
    }
    if (subscription?.checkout_attempted_at) {
      return Response.json({ error: "A criação da assinatura está em conciliação. A gestão precisa verificar o Asaas antes de tentar novamente." }, { status: 409 });
    }

    if (!subscription) {
      subscription = {
        id: crypto.randomUUID(),
        asaas_checkout_id: null,
        asaas_checkout_url: null,
        checkout_attempted_at: null,
      };
      await supabaseAdmin("subscriptions", {
        method: "POST",
        body: {
          id: subscription.id,
          member_id: memberId,
          status: "pending_configuration",
          amount_cents: Math.round(monthlyValue * 100),
          billing_cycle: "MONTHLY",
        },
      });
    }

    const attemptedAt = new Date().toISOString();
    const claimedAttempt = await supabaseAdmin<Array<{ id: string }>>("subscriptions", {
      method: "PATCH",
      query: { id: `eq.${subscription.id}`, asaas_checkout_id: "is.null", checkout_attempted_at: "is.null" },
      prefer: "return=representation",
      body: { checkout_attempted_at: attemptedAt, updated_at: attemptedAt },
    });
    if (!claimedAttempt[0]) {
      return Response.json({ error: "Outra tentativa de assinatura já está em andamento." }, { status: 409 });
    }

    const origin = currentEnv.APT_PUBLIC_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const nextDueDate = new Date().toISOString().slice(0, 10);
    let asaasResponse: Response;
    try {
      asaasResponse = await asaasRequest("/checkouts", {
        method: "POST",
        body: JSON.stringify({
          billingTypes: ["CREDIT_CARD"],
          chargeTypes: ["RECURRENT"],
          minutesToExpire: 1440,
          externalReference: memberId,
          callback: {
            successUrl: `${origin}/cadastro?status=sucesso`,
            cancelUrl: `${origin}/cadastro?status=cancelado`,
            expiredUrl: `${origin}/cadastro?status=expirado`,
          },
          items: [{ name: "Participação mensal APT", description: "Mensalidade do APT Tennis Club", quantity: 1, value: monthlyValue }],
          customerData: { name, cpfCnpj: cpf, email, phone },
          subscription: { cycle: "MONTHLY", nextDueDate: `${nextDueDate} 12:00:00` },
        }),
      });
    } catch {
      throw new SupabaseRequestError("A resposta do Asaas ficou inconclusiva. Não tente novamente até a gestão conciliar a tentativa.", 409);
    }

    const asaasPayload = await asaasResponse.json() as { id?: string; link?: string; errors?: Array<{ description?: string }> };
    if (!asaasResponse.ok || !asaasPayload.id) {
      const deterministicRejection = asaasResponse.status >= 400 && asaasResponse.status < 500;
      if (deterministicRejection) {
        await supabaseAdmin("subscriptions", {
          method: "PATCH",
          query: { id: `eq.${subscription.id}` },
          body: { checkout_attempted_at: null, updated_at: new Date().toISOString() },
        });
      }
      throw new SupabaseRequestError(
        deterministicRejection
          ? asaasPayload.errors?.[0]?.description || "O Asaas recusou a configuração da assinatura."
          : "A resposta do Asaas ficou inconclusiva. A gestão precisa conciliar a tentativa antes de um novo envio.",
        deterministicRejection ? 502 : 409,
      );
    }

    const checkoutId = asaasPayload.id;
    const checkoutUrl = asaasPayload.link || asaasCheckoutUrl(checkoutId);
    try {
      await supabaseAdmin("subscriptions", {
        method: "PATCH",
        query: { id: `eq.${subscription.id}`, asaas_checkout_id: "is.null" },
        body: {
          asaas_checkout_id: checkoutId,
          asaas_checkout_url: checkoutUrl,
          status: "awaiting_payment",
          checkout_attempted_at: null,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      const cancelled = await asaasRequest(`/checkouts/${encodeURIComponent(checkoutId)}/cancel`, { method: "POST" })
        .then((response) => response.ok || response.status === 404)
        .catch(() => false);
      if (cancelled) {
        await supabaseAdmin("subscriptions", {
          method: "PATCH",
          query: { id: `eq.${subscription.id}` },
          body: { checkout_attempted_at: null, updated_at: new Date().toISOString() },
        }).catch(() => undefined);
      }
      throw error;
    }

    await Promise.all([
      supabaseAdmin("invites", { method: "PATCH", query: { id: `eq.${invite.id}` }, body: { used_at: new Date().toISOString() } }),
      application
        ? supabaseAdmin("applications", {
          method: "PATCH",
          query: { id: `eq.${application.id}` },
          body: { status: "registered", updated_at: new Date().toISOString() },
        })
        : Promise.resolve(),
      supabaseAdmin("audit_logs", {
        method: "POST",
        body: { actor: email, action: "member.recadastro_completed", entity_type: "member", entity_id: memberId, metadata: { consent_version: "2026-08" } },
      }),
    ]);

    return Response.json({ memberId, paymentConfigured: true, checkoutUrl }, { status: 201 });
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    return Response.json(
      { error: status === 503 ? "O Supabase ainda está sendo configurado." : error instanceof Error ? error.message : "Não foi possível concluir o cadastro agora." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
