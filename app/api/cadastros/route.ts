import { asaasCheckoutUrl, asaasRequest } from "../../../lib/asaas";
import { isValidCpf } from "../../../lib/cpf";
import { createAuthUser, runtimeEnv, sha256, supabaseAdmin, SupabaseRequestError } from "../../../lib/supabase-server";

type InviteRow = { id: string; application_id: string; expires_at: string; used_at: string | null; revoked_at: string | null };
type ApplicationRow = { id: string; name: string; email: string; class_level: string; status: string };
type ExistingMember = { id: string; application_id: string; participation_status: string };

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      inviteToken?: string; name?: string; cpf?: string; email?: string; phone?: string; password?: string; consent?: boolean;
    };
    const inviteToken = payload.inviteToken?.trim() || "";
    const name = payload.name?.trim() || "";
    const cpf = payload.cpf?.replace(/\D/g, "") || "";
    const email = payload.email?.trim().toLowerCase() || "";
    const phone = payload.phone?.replace(/\D/g, "") || "";
    const password = payload.password || "";
    if (!inviteToken || !name || !isValidCpf(cpf) || !email || phone.length < 10 || password.length < 8 || payload.consent !== true) {
      return Response.json({ error: "Confira o convite, os dados e a senha de acesso." }, { status: 400 });
    }

    const inviteHash = await sha256(inviteToken);
    const invites = await supabaseAdmin<InviteRow[]>("invites", {
      query: { select: "id,application_id,expires_at,used_at,revoked_at", token_hash: `eq.${inviteHash}`, used_at: "is.null", revoked_at: "is.null", limit: "1" },
    });
    const invite = invites[0];
    if (!invite || new Date(invite.expires_at).getTime() <= Date.now()) {
      return Response.json({ error: "Este convite não é válido ou já expirou." }, { status: 403 });
    }

    const applications = await supabaseAdmin<ApplicationRow[]>("applications", {
      query: { select: "id,name,email,class_level,status", id: `eq.${invite.application_id}`, limit: "1" },
    });
    const application = applications[0];
    if (!application || !["approved", "invite_sent"].includes(application.status)) {
      return Response.json({ error: "Este requerimento não está liberado para cadastro." }, { status: 403 });
    }

    const cpfSecret = runtimeEnv().CPF_HASH_SECRET;
    if (!cpfSecret) return Response.json({ error: "A proteção do CPF ainda está sendo configurada." }, { status: 503 });
    const cpfHash = await sha256(`${cpfSecret}:${cpf}`);
    const [sameEmail, sameCpf] = await Promise.all([
      supabaseAdmin<ExistingMember[]>("members", { query: { select: "id,application_id,participation_status", email: `eq.${email}`, limit: "1" } }),
      supabaseAdmin<ExistingMember[]>("members", { query: { select: "id,application_id,participation_status", cpf_hash: `eq.${cpfHash}`, limit: "1" } }),
    ]);
    const existingMember = sameEmail[0] || sameCpf[0];
    if (sameEmail[0] && sameCpf[0] && sameEmail[0].id !== sameCpf[0].id) {
      return Response.json({ error: "Já existe um cadastro associado a este e-mail ou CPF." }, { status: 409 });
    }

    if (existingMember && (existingMember.application_id !== application.id || existingMember.participation_status !== "awaiting_payment")) {
      return Response.json({ error: "Já existe um cadastro associado a este e-mail ou CPF." }, { status: 409 });
    }

    if (existingMember) {
      const subscriptions = await supabaseAdmin<Array<{ asaas_checkout_id: string | null }>>("subscriptions", {
        query: { select: "asaas_checkout_id", member_id: `eq.${existingMember.id}`, limit: "1" },
      });
      if (subscriptions[0]?.asaas_checkout_id) {
        return Response.json({ memberId: existingMember.id, paymentConfigured: true, checkoutUrl: asaasCheckoutUrl(subscriptions[0].asaas_checkout_id) });
      }
    }

    const currentEnv = runtimeEnv();
    const apiKey = currentEnv.ASAAS_API_KEY;
    const monthlyValue = Number(currentEnv.ASAAS_MONTHLY_VALUE || 20);
    if (!apiKey || monthlyValue <= 0) {
      return Response.json({ error: "A cobrança do APT ainda está sendo configurada." }, { status: 503 });
    }

    const memberId = existingMember?.id || crypto.randomUUID();
    if (!existingMember) {
      const authUserId = await createAuthUser({ email, password, name, memberId });
      await supabaseAdmin("members", {
        method: "POST",
        body: {
          id: memberId, application_id: application.id, auth_user_id: authUserId, name, email,
          whatsapp: phone, cpf_hash: cpfHash, cpf_last4: cpf.slice(-4), class_level: application.class_level,
          participation_status: "awaiting_payment",
        },
      });
    }

    const subscriptionId = crypto.randomUUID();
    const origin = currentEnv.APT_PUBLIC_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const nextDueDate = new Date().toISOString().slice(0, 10);
    const asaasResponse = await asaasRequest("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        billingTypes: ["CREDIT_CARD"], chargeTypes: ["RECURRENT"], minutesToExpire: 1440,
        externalReference: memberId,
        callback: {
          successUrl: `${origin}/cadastro?status=sucesso`, cancelUrl: `${origin}/cadastro?status=cancelado`,
          expiredUrl: `${origin}/cadastro?status=expirado`,
        },
        items: [{ name: "Participação mensal APT", description: "Mensalidade do APT Tennis Club", quantity: 1, value: monthlyValue }],
        customerData: { name, cpfCnpj: cpf, email, phone },
        subscription: { cycle: "MONTHLY", nextDueDate: `${nextDueDate} 12:00:00` },
      }),
    });
    const asaasPayload = await asaasResponse.json() as { id?: string; errors?: Array<{ description?: string }> };
    if (!asaasResponse.ok || !asaasPayload.id) {
      throw new SupabaseRequestError(asaasPayload.errors?.[0]?.description || "O Asaas não conseguiu preparar a assinatura.", 502);
    }
    const checkoutId = asaasPayload.id;
    const checkoutUrl = asaasCheckoutUrl(checkoutId);

    await Promise.all([
      supabaseAdmin("subscriptions", {
        method: "POST",
        body: {
          id: subscriptionId, member_id: memberId, asaas_checkout_id: checkoutId || null,
          status: "awaiting_payment", amount_cents: Math.round(monthlyValue * 100), billing_cycle: "MONTHLY",
        },
      }),
      supabaseAdmin("invites", { method: "PATCH", query: { id: `eq.${invite.id}` }, body: { used_at: new Date().toISOString() } }),
      supabaseAdmin("applications", {
        method: "PATCH", query: { id: `eq.${application.id}` }, body: { status: "registered", updated_at: new Date().toISOString() },
      }),
      supabaseAdmin("audit_logs", {
        method: "POST", body: { actor: email, action: "member.registered", entity_type: "member", entity_id: memberId, metadata: { consent_version: "2026-08" } },
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
