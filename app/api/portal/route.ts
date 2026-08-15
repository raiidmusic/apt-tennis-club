import { getSession } from "../../../lib/auth";
import { asaasRequest } from "../../../lib/asaas";
import { sendManagementEmail, sendMemberEmail } from "../../../lib/apt-email";
import { reconcileMemberBilling } from "../../../lib/billing-reconciliation";
import { supabaseAdmin, SupabaseRequestError } from "../../../lib/supabase-server";

type MemberRow = {
  id: string; name: string; email: string; whatsapp: string; cpf_last4: string;
  class_level: string | null; participation_status: string; twinner_url: string | null;
  whatsapp_community_url: string | null; joined_at: string | null;
};

const clubLinks = {
  tweenerUrl: "https://app.tweener.club/groups/dd12bbfd-db69-43a2-b683-cccffc322daf",
  whatsappCommunityUrl: "https://chat.whatsapp.com/EJOW47yPnwM0q9Zfm6CaUH?s=cl&p=i&ilr=2",
};

async function portalPayload(memberId: string) {
    const [members, subscriptions, payments] = await Promise.all([
      supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,name,email,whatsapp,cpf_last4,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at", id: `eq.${memberId}`, limit: "1" },
      }),
      supabaseAdmin<Array<Record<string, unknown>>>("subscriptions", {
        query: { select: "id,status,amount_cents,next_due_date,current_period_end,cancel_at_period_end,asaas_subscription_id,asaas_checkout_url", member_id: `eq.${memberId}`, limit: "1" },
      }),
      supabaseAdmin<Array<Record<string, unknown>>>("payments", {
        query: { select: "id,status,value_cents,due_date,paid_at,invoice_url,created_at", member_id: `eq.${memberId}`, order: "created_at.desc", limit: "24" },
      }),
    ]);
    const member = members[0];
    if (!member) throw new SupabaseRequestError("Cadastro não encontrado.", 404);
    const subscription = subscriptions[0] || null;
    const currentPeriodEnd = typeof subscription?.current_period_end === "string" ? subscription.current_period_end : null;
    const paidAccessRemains = member.participation_status === "cancellation_requested" &&
      Boolean(currentPeriodEnd && currentPeriodEnd >= new Date().toISOString().slice(0, 10));
    const accessActive = member.participation_status === "active" || member.participation_status === "courtesy" || paidAccessRemains;
    return {
      member: {
        id: member.id, name: member.name, email: member.email, whatsapp: member.whatsapp,
        cpfMasked: `***.***.***-${member.cpf_last4}`, classLevel: member.class_level,
        participationStatus: member.participation_status,
        twinnerUrl: accessActive ? member.twinner_url || clubLinks.tweenerUrl : null,
        whatsappCommunityUrl: accessActive ? member.whatsapp_community_url || clubLinks.whatsappCommunityUrl : null,
        accessActive,
        joinedAt: member.joined_at,
      },
      subscription,
      payments,
    };
}

export async function GET(request: Request) {
  const session = await getSession(request).catch(() => null);
  if (!session?.memberId) return Response.json({ error: "Faça login para acessar sua participação." }, { status: 401 });
  try {
    return Response.json(await portalPayload(session.memberId));
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    return Response.json({ error: error instanceof SupabaseRequestError ? error.message : "Não foi possível carregar sua participação." }, { status });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession(request).catch(() => null);
  if (!session?.memberId) return Response.json({ error: "Faça login para continuar." }, { status: 401 });
  const payload = await request.json() as { action?: string; name?: string; whatsapp?: string };
  try {
    if (payload.action === "refresh_billing") {
      const result = await reconcileMemberBilling(session.memberId);
      return Response.json({ reconciled: true, ...result, portal: await portalPayload(session.memberId) });
    }

    if (payload.action === "update_profile") {
      const name = payload.name?.trim().replace(/\s+/g, " ") || "";
      const whatsapp = payload.whatsapp?.replace(/\D/g, "") || "";
      if (name.length < 2 || name.length > 100 || whatsapp.length < 10 || whatsapp.length > 13) {
        return Response.json({ error: "Confira o nome e o WhatsApp com DDD." }, { status: 400 });
      }
      const rows = await supabaseAdmin<MemberRow[]>("members", {
        method: "PATCH",
        query: { id: `eq.${session.memberId}` },
        prefer: "return=representation",
        body: { name, whatsapp, updated_at: new Date().toISOString() },
      });
      if (!rows[0]) return Response.json({ error: "Cadastro não encontrado." }, { status: 404 });
      await supabaseAdmin("audit_logs", {
        method: "POST",
        body: { actor: session.email, action: "member.profile_updated", entity_type: "member", entity_id: session.memberId, metadata: { changed: ["name", "whatsapp"] } },
      });
      return Response.json({ updated: true, member: { name: rows[0].name, whatsapp: rows[0].whatsapp } });
    }

    if (payload.action === "request_card_change") {
      const subscriptions = await supabaseAdmin<Array<{ asaas_subscription_id: string | null; asaas_checkout_url: string | null; status: string }>>("subscriptions", {
        query: { select: "asaas_subscription_id,asaas_checkout_url,status", member_id: `eq.${session.memberId}`, limit: "1" },
      });
      const subscription = subscriptions[0];
      if (!subscription) return Response.json({ error: "Assinatura não encontrada." }, { status: 404 });
      if (!subscription.asaas_subscription_id && subscription.asaas_checkout_url) {
        return Response.json({ requested: false, checkoutUrl: subscription.asaas_checkout_url });
      }
      const message = "Solicitação do membro: trocar o cartão da assinatura por um novo checkout hospedado do Asaas.";
      await Promise.all([
        supabaseAdmin("admin_notes", { method: "POST", body: { member_id: session.memberId, body: message, created_by: session.email } }),
        supabaseAdmin("audit_logs", { method: "POST", body: { actor: session.email, action: "membership.card_change_requested", entity_type: "member", entity_id: session.memberId } }),
      ]);
      await sendManagementEmail({
        replyTo: session.email,
        subject: "Solicitação de troca de cartão",
        text: `Um membro solicitou a troca do cartão da assinatura.\n\nE-mail: ${session.email}\n\nAcesse a gestão para gerar e acompanhar um novo checkout hospedado do Asaas.`,
        flow: "card_change_management",
        idempotencyKey: `apt-card-change-management-${session.memberId}-${new Date().toISOString().slice(0, 10)}`,
      });
      return Response.json({ requested: true });
    }

    if (payload.action !== "request_cancellation") return Response.json({ error: "Ação inválida." }, { status: 400 });
    const subscriptions = await supabaseAdmin<Array<{ id: string; asaas_subscription_id: string | null; status: string; current_period_end: string | null }>>("subscriptions", {
      query: { select: "id,asaas_subscription_id,status,current_period_end", member_id: `eq.${session.memberId}`, limit: "1" },
    });
    const subscription = subscriptions[0];
    if (!subscription) return Response.json({ error: "Não encontramos uma assinatura para cancelar." }, { status: 404 });

    if (!subscription.asaas_subscription_id && subscription.status !== "cancelled") {
      return Response.json({ error: "Sua assinatura ainda não foi ativada. Não há uma renovação recorrente para cancelar." }, { status: 409 });
    }

    if (subscription.asaas_subscription_id && subscription.status !== "cancelled") {
      const response = await asaasRequest(`/subscriptions/${encodeURIComponent(subscription.asaas_subscription_id)}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        return Response.json({ error: "O Asaas não confirmou o cancelamento. Tente novamente." }, { status: 502 });
      }
    }

    const accessUntil = subscription.current_period_end;
    const accessRemains = Boolean(accessUntil && accessUntil >= new Date().toISOString().slice(0, 10));
    await Promise.all([
      supabaseAdmin("members", {
        method: "PATCH", query: { id: `eq.${session.memberId}` },
        body: { participation_status: accessRemains ? "cancellation_requested" : "cancelled", updated_at: new Date().toISOString() },
      }),
      supabaseAdmin("subscriptions", {
        method: "PATCH", query: { member_id: `eq.${session.memberId}` },
        body: { status: "cancelled", cancel_at_period_end: false, updated_at: new Date().toISOString() },
      }),
      supabaseAdmin("audit_logs", {
        method: "POST", body: { actor: session.email, action: "membership.cancelled", entity_type: "member", entity_id: session.memberId },
      }),
    ]);
    await Promise.all([
      sendMemberEmail({
        to: session.email,
        subject: "Sua renovação APT foi encerrada",
        text: `Olá. A renovação automática da sua participação foi encerrada.${accessRemains ? ` Seu acesso segue ativo até ${accessUntil}.` : ""}`,
        flow: "cancellation_member",
        idempotencyKey: `apt-cancellation-member-${session.memberId}`,
      }),
      sendManagementEmail({
        replyTo: session.email,
        subject: "Participação encerrada por membro",
        text: `Um membro encerrou a renovação automática.\n\nE-mail: ${session.email}${accessRemains ? `\nAcesso vigente até: ${accessUntil}` : ""}`,
        flow: "cancellation_management",
        idempotencyKey: `apt-cancellation-management-${session.memberId}`,
      }),
    ]);
    return Response.json({ cancelled: true, accessUntil: accessRemains ? accessUntil : null });
  } catch (error) {
    const status = error instanceof SupabaseRequestError ? error.status : 500;
    const fallback = payload.action === "refresh_billing"
      ? "Não foi possível atualizar sua situação financeira agora."
      : payload.action === "update_profile"
        ? "Não foi possível salvar seu cadastro agora."
        : payload.action === "request_card_change"
          ? "Não foi possível registrar a troca do cartão agora."
          : "Não foi possível cancelar a renovação agora.";
    return Response.json({ error: error instanceof SupabaseRequestError ? error.message : fallback }, { status });
  }
}
