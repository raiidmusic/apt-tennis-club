import { timingSafeEqual } from "node:crypto";
import { retryBillingEmailDeliveries } from "../../../../lib/apt-email";
import { reconcileMemberBilling } from "../../../../lib/billing-reconciliation";
import { runtimeEnv, supabaseAdmin } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SubscriptionCandidate = { member_id: string };

function authorized(request: Request) {
  const secret = runtimeEnv().CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (!expected || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });

  const candidates = await supabaseAdmin<SubscriptionCandidate[]>("subscriptions", {
    query: {
      select: "member_id",
      status: "in.(pending_configuration,awaiting_payment,active,past_due,cancel_at_period_end)",
      order: "updated_at.asc",
      limit: "40",
    },
  });
  let reconciled = 0;
  let failed = 0;
  for (let index = 0; index < candidates.length; index += 4) {
    const batch = await Promise.allSettled(
      candidates.slice(index, index + 4).map(({ member_id }) => reconcileMemberBilling(member_id)),
    );
    reconciled += batch.filter((result) => result.status === "fulfilled").length;
    failed += batch.filter((result) => result.status === "rejected").length;
  }
  const emailResults = await retryBillingEmailDeliveries(40);

  return Response.json({
    ok: failed === 0,
    checked: candidates.length,
    reconciled,
    failed,
    emailsSent: emailResults.filter((status) => status === "sent").length,
    emailsPending: emailResults.filter((status) => status !== "sent").length,
  });
}
