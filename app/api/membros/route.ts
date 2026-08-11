import { requireAdmin } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase-server";

type MemberRow = {
  id: string; name: string; email: string; whatsapp: string; class_level: string | null;
  participation_status: string; joined_at: string | null; created_at: string;
};
type SubscriptionRow = {
  member_id: string; status: string; amount_cents: number; next_due_date: string | null;
  overdue_since: string | null; cancel_at_period_end: boolean;
};

export async function GET(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const [members, subscriptions] = await Promise.all([
      supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,name,email,whatsapp,class_level,participation_status,joined_at,created_at", order: "name.asc" },
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
        classLevel: member.class_level,
        participationStatus: overdueDays >= 7 ? "delinquent" : member.participation_status,
        subscriptionStatus: subscription?.status || "pending_configuration", amountCents: subscription?.amount_cents || 0,
        nextDueDate: subscription?.next_due_date, overdueDays, cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
      };
    });
    return Response.json({ members: result });
  } catch {
    return Response.json({ error: "Não foi possível carregar os integrantes." }, { status: 500 });
  }
}
