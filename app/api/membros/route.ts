import { requireAdmin } from "../../../lib/auth";
import { reconcileMemberBilling } from "../../../lib/billing-reconciliation";
import { requireTrustedOrigin } from "../../../lib/request-security";
import { supabaseAdmin } from "../../../lib/supabase-server";

type MemberRow = {
  id: string; name: string; email: string; whatsapp: string; class_level: string | null;
  participation_status: string; twinner_url: string | null; whatsapp_community_url: string | null;
  joined_at: string | null; created_at: string;
};
type SubscriptionRow = {
  member_id: string; status: string; amount_cents: number; next_due_date: string | null;
  current_period_end: string | null; overdue_since: string | null; cancel_at_period_end: boolean;
};
type MemberPayment = { id: string; status: string; value_cents: number; due_date: string | null; paid_at: string | null; invoice_url: string | null; created_at: string };
type MemberNote = { id: string; body: string; created_by: string; created_at: string };

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
    const memberId = new URL(request.url).searchParams.get("id");
    if (memberId) {
      if (!uuidPattern.test(memberId)) return Response.json({ error: "Integrante inválido." }, { status: 400 });
      const [memberRows, subscriptionRows, payments, notes] = await Promise.all([
        supabaseAdmin<MemberRow[]>("members", { query: { select: "id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", id: `eq.${memberId}`, limit: "1" } }),
        supabaseAdmin<SubscriptionRow[]>("subscriptions", { query: { select: "member_id,status,amount_cents,next_due_date,current_period_end,overdue_since,cancel_at_period_end", member_id: `eq.${memberId}`, limit: "1" } }),
        supabaseAdmin<MemberPayment[]>("payments", { query: { select: "id,status,value_cents,due_date,paid_at,invoice_url,created_at", member_id: `eq.${memberId}`, order: "created_at.desc", limit: "24" } }),
        supabaseAdmin<MemberNote[]>("admin_notes", { query: { select: "id,body,created_by,created_at", member_id: `eq.${memberId}`, order: "created_at.asc" } }),
      ]);
      const member = memberRows[0];
      if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
      const subscription = subscriptionRows[0] || null;
      const overdueDays = subscription?.overdue_since
        ? Math.max(0, Math.floor((Date.now() - new Date(`${subscription.overdue_since}T00:00:00`).getTime()) / 86_400_000))
        : 0;
      return Response.json({ member: {
        id: member.id, name: member.name, email: member.email, whatsapp: member.whatsapp, classLevel: member.class_level,
        twinnerUrl: member.twinner_url, whatsappCommunityUrl: member.whatsapp_community_url, joinedAt: member.joined_at, createdAt: member.created_at,
        participationStatus: ["courtesy", "inactive"].includes(member.participation_status) ? member.participation_status : overdueDays >= 7 ? "delinquent" : member.participation_status,
        subscriptionStatus: subscription?.status || "pending_configuration", amountCents: subscription?.amount_cents || 0,
        nextDueDate: subscription?.next_due_date, currentPeriodEnd: subscription?.current_period_end, overdueDays, cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
        payments, notes,
      } });
    }
    const [members, subscriptions] = await Promise.all([
      supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", order: "name.asc" },
      }),
      supabaseAdmin<SubscriptionRow[]>("subscriptions", {
        query: { select: "member_id,status,amount_cents,next_due_date,current_period_end,overdue_since,cancel_at_period_end" },
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
        nextDueDate: subscription?.next_due_date, currentPeriodEnd: subscription?.current_period_end, overdueDays, cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
      };
    });
    return Response.json({ members: result });
  } catch {
    return Response.json({ error: "Não foi possível carregar os integrantes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: string; action?: string };
    if (payload.action !== "refresh_billing" || !payload.id || !uuidPattern.test(payload.id)) {
      return Response.json({ error: "Atualização financeira inválida." }, { status: 400 });
    }
    const result = await reconcileMemberBilling(payload.id);
    await supabaseAdmin("audit_logs", {
      method: "POST",
      body: { actor: admin.email, action: "member.billing_reconciled", entity_type: "member", entity_id: payload.id, metadata: result },
    });
    return Response.json({ reconciled: true, ...result });
  } catch {
    return Response.json({ error: "Não foi possível conciliar este integrante com o Asaas." }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: string; participationStatus?: string; twinnerUrl?: string; whatsappCommunityUrl?: string; note?: string };
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
    const note = payload.note?.trim() || "";
    if (note.length > 1_200) return Response.json({ error: "A nota deve ter até 1.200 caracteres." }, { status: 400 });
    if (Object.keys(updates).length === 0 && !note) return Response.json({ error: "Nenhuma alteração foi informada." }, { status: 400 });

    const rows = Object.keys(updates).length
      ? await supabaseAdmin<MemberRow[]>("members", {
        method: "PATCH", query: { id: `eq.${payload.id}` }, prefer: "return=representation",
        body: { ...updates, updated_at: new Date().toISOString() },
      })
      : await supabaseAdmin<MemberRow[]>("members", { query: { select: "id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", id: `eq.${payload.id}`, limit: "1" } });
    const member = rows[0];
    if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
    const savedNote = note ? (await supabaseAdmin<MemberNote[]>("admin_notes", { method: "POST", prefer: "return=representation", body: { member_id: member.id, body: note, created_by: admin.email } }))[0] : undefined;
    await supabaseAdmin("audit_logs", {
      method: "POST",
      body: { actor: admin.email, action: "member.management_updated", entity_type: "member", entity_id: member.id, metadata: { changed: Object.keys(updates), note_recorded: Boolean(savedNote) } },
    });
    return Response.json({ member: { id: member.id, participationStatus: member.participation_status, twinnerUrl: member.twinner_url, whatsappCommunityUrl: member.whatsapp_community_url }, note: savedNote });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o integrante." }, { status: 500 });
  }
}
