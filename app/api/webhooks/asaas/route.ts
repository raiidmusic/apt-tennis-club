import { after } from "next/server";
import { processAsaasEvent, type AsaasEvent, type StoredEvent } from "../../../../lib/asaas-events";
import { runtimeEnv, supabaseAdmin } from "../../../../lib/supabase-server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const signal = AbortSignal.timeout(55_000);
  const configuredToken = runtimeEnv().ASAAS_WEBHOOK_TOKEN;
  const receivedToken = request.headers.get("asaas-access-token");
  if (!configuredToken || receivedToken !== configuredToken) {
    return Response.json({ received: false }, { status: 401 });
  }

  let payload: AsaasEvent;
  try {
    payload = await request.json() as AsaasEvent;
  } catch {
    return Response.json({ received: false }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || typeof payload.id !== "string" || !payload.id || payload.id.length > 200 || typeof payload.event !== "string" || !payload.event || payload.event.length > 100) return Response.json({ received: false }, { status: 400 });

  try {
    const existing = await supabaseAdmin<StoredEvent[]>("webhook_events", {
      query: { select: "id,processed_at", id: `eq.${payload.id}`, limit: "1" }, signal,
    });
    if (existing[0]?.processed_at) return Response.json({ received: true, duplicate: true });
    if (!existing[0]) {
      await supabaseAdmin("webhook_events", {
        method: "POST",
        query: { on_conflict: "id" },
        prefer: "resolution=ignore-duplicates,return=minimal",
        body: { id: payload.id, event_type: payload.event, payload, processed_at: null }, signal,
      });
    }
  } catch {
    return Response.json({ received: false }, { status: 500 });
  }

  after(async () => {
    await processAsaasEvent(payload, signal);
  });
  return Response.json({ received: true, queued: true });
}
