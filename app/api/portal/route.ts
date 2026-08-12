import { getSession } from "../../../lib/auth";
import { asaasRequest } from "../../../lib/asaas";
import { supabaseAdmin } from "../../../lib/supabase-server";

type MemberRow = {
  id: string; name: string; email: string; whatsapp: string; cpf_last4: string;
  class_level: string | null; participation_status: string; twinner_url: string | null;
  whatsapp_community_url: string | null; joined_at: string | null;
};

const clubLinks = {
  tweenerUrl: "https://app.tweener.club/groups/dd12bbfd-db69-43a2-b683-cccffc322daf",
  whatsappCommunityUrl: "https://chat.whatsapp.com/EJOW47yPnwM0q9Zfm6CaUH?s=cl&p=i&ilr=2",
};

export async function GET(request: Request) {
  const session = await getSession(request).catch(() => null);
  if (!session?.memberId) return Response.json({ error: "Faça login para acessar sua participação." }, { status: 401 });
  try {
    const [members, subscriptions, payments] = await Promise.all([
      supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,name,email,whatsapp,cpf_last4,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at", id: `eq.${session.memberId}`, limit: "1" },
      }),
      supabaseAdmin<Array<Record<string, unknown>>>("subscriptions", {
        query: { select: "id,status,amount_cents,next_due_date,current_period_end,cancel_at_period_end,asaas_subscription_id", member_id: `eq.${session.memberId}`, limit: "1" },
      }),
      supabaseAdmin<Array<Record<string, unknown>>>("payments", {
        query: { select: "id,status,value_cents,due_date,paid_at,invoice_url,created_at", member_id: `eq.${session.memberId}`, order: "created_at.desc", limit: "24" },
      }),
    ]);
    const member = members[0];
    if (!member) return Response.json({ error: "Cadastro não encontrado." }, { status: 404 });
    const subscription = subscriptions[0] || null;
    const currentPeriodEnd = typeof subscription?.current_period_end === "string" ? subscription.current_period_end : null;
    const paidAccessRemains = member.participation_status === "cancellation_requested" &&
      Boolean(currentPeriodEnd && currentPeriodEnd >= new Date().toISOString().slice(0, 10));
    const accessActive = member.participation_status === "active" || member.participation_status === "courtesy" || paidAccessRemains;
    return Response.json({
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
    });
  } catch {
    return Response.json({ error: "Não foi possível carregar sua participação." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession(request).catch(() => null);
  if (!session?.memberId) return Response.json({ error: "Faça login para continuar." }, { status: 401 });
  const payload = await request.json() as { action?: string };
  if (payload.action !== "request_cancellation") return Response.json({ error: "Ação inválida." }, { status: 400 });
  try {
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
    return Response.json({ cancelled: true, accessUntil: accessRemains ? accessUntil : null });
  } catch {
    return Response.json({ error: "Não foi possível cancelar a renovação agora." }, { status: 500 });
  }
}
