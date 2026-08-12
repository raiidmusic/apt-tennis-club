import { requireAdmin } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase-server";

type MemberRow = {
  id: string; name: string; email: string; whatsapp: string; class_level: string | null;
  participation_status: string; twinner_url: string | null; whatsapp_community_url: string | null;
  joined_at: string | null; created_at: string;
};
type SubscriptionRow = {
  member_id: string; status: string; amount_cents: number; next_due_date: string | null;
  overdue_since: string | null; cancel_at_period_end: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const manualStatuses = new Set(["pending_payment", "courtesy", "inactive"]);

function allowedClubUrl(value: string, host: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const [members, subscriptions] = await Promise.all([
      supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", order: "name.asc" },
      }),
      supabaseAdmin<SubscriptionRow[]>("subscriptions", {
        query: { select: "member_id,status,amount_cents,next_due_date,overdue_since,cancel_at_period_end" },
      }),
    ]);
    const subscriptionByMember = new Map(subscriptions.map((item) => [item.member_id, item]));
    const result = members.map((member) => {
      const subscription = subscriptionByMember.get(member.id);
      const overdueDays = subscription?.overdue_since
        ? Math.max(0, Math.floor((Date.now() - new Date(`${subscription.overdue_since}T00:00:00`).getTime()) / 86_400_000))
        : 0;
      return {
        id: member.id, name: member.name, email: member.email, whatsapp: member.whatsapp,
        classLevel: member.class_level, twinnerUrl: member.twinner_url, whatsappCommunityUrl: member.whatsapp_community_url,
        participationStatus: ["courtesy", "inactive"].includes(member.participation_status) ? member.participation_status : overdueDays >= 7 ? "delinquent" : member.participation_status,
        subscriptionStatus: subscription?.status || "pending_configuration", amountCents: subscription?.amount_cents || 0,
        nextDueDate: subscription?.next_due_date, overdueDays, cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
      };
    });
    return Response.json({ members: result });
  } catch {
    return Response.json({ error: "Não foi possível carregar os integrantes." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: string; participationStatus?: string; twinnerUrl?: string; whatsappCommunityUrl?: string };
    if (!payload.id || !uuidPattern.test(payload.id)) return Response.json({ error: "Integrante inválido." }, { status: 400 });
    const updates: Record<string, string | null> = {};
    if (payload.participationStatus !== undefined) {
      if (!manualStatuses.has(payload.participationStatus)) return Response.json({ error: "Esse estado não pode ser alterado manualmente." }, { status: 400 });
      updates.participation_status = payload.participationStatus;
    }
    if (payload.twinnerUrl !== undefined) {
      const value = payload.twinnerUrl.trim();
      if (value && !allowedClubUrl(value, "tweener.club")) return Response.json({ error: "Use um link seguro do Tweener." }, { status: 400 });
      updates.twinner_url = value || null;
    }
    if (payload.whatsappCommunityUrl !== undefined) {
      const value = payload.whatsappCommunityUrl.trim();
      if (value && !allowedClubUrl(value, "chat.whatsapp.com")) return Response.json({ error: "Use um convite seguro da comunidade do WhatsApp." }, { status: 400 });
      updates.whatsapp_community_url = value || null;
    }
    if (Object.keys(updates).length === 0) return Response.json({ error: "Nenhuma alteração foi informada." }, { status: 400 });

    const rows = await supabaseAdmin<MemberRow[]>("members", {
      method: "PATCH", query: { id: `eq.${payload.id}` }, prefer: "return=representation",
      body: { ...updates, updated_at: new Date().toISOString() },
    });
    const member = rows[0];
    if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
    await supabaseAdmin("audit_logs", {
      method: "POST",
      body: { actor: admin.email, action: "member.management_updated", entity_type: "member", entity_id: member.id, metadata: { changed: Object.keys(updates) } },
    });
    return Response.json({ member: { id: member.id, participationStatus: member.participation_status, twinnerUrl: member.twinner_url, whatsappCommunityUrl: member.whatsapp_community_url } });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o integrante." }, { status: 500 });
  }
}
