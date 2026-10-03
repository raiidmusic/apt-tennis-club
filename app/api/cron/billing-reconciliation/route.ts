import { timingSafeEqual } from "node:crypto";
import { runBillingRecovery } from "../../../../lib/billing-recovery";
import { runtimeEnv } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = runtimeEnv().CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (!expected || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });

  try {
    return Response.json(await runBillingRecovery());
  } catch {
    return Response.json({ ok: false, error: "Não foi possível registrar a recuperação financeira." }, { status: 500 });
  }
}
