import { createHmac, timingSafeEqual } from "node:crypto";
import { runtimeEnv, supabaseAdmin } from "./supabase-server";

export const emailEventTypes = ["email.sent", "email.delivered", "email.delivery_delayed", "email.failed", "email.bounced", "email.complained", "email.opened", "email.clicked", "email.suppressed"] as const;
type EmailEventType = typeof emailEventTypes[number];
type EmailEvent = { event_id: string; provider_email_id: string; event_type: EmailEventType; occurred_at: string; received_at: string };
const identifier = /^[a-z0-9_-]{1,128}$/i;
const bodyLimit = 65_536;

function base64Bytes(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  const bytes = Buffer.from(value, "base64");
  return bytes.toString("base64").replace(/=+$/, "") === value.replace(/=+$/, "") ? bytes : null;
}

export function emailObservabilityConfiguration() {
  return { webhookSecretConfigured: Boolean(runtimeEnv().RESEND_WEBHOOK_SECRET), trackingVerification: "not_verified" as const };
}

function validSignature(raw: Buffer, headers: Headers, secret: string) {
  const id = headers.get("svix-id") || "";
  const timestamp = headers.get("svix-timestamp") || "";
  const signatures = headers.get("svix-signature") || "";
  const key = base64Bytes(secret.slice(6));
  if (!secret.startsWith("whsec_") || !key?.length || !identifier.test(id)
    || !/^\d{1,12}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || signatures.length > 4096) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.`).update(raw).digest();
  return signatures.split(/\s+/).some((entry) => {
    const value = /^v1,([A-Za-z0-9+/]+={0,2})$/.exec(entry)?.[1];
    if (!value) return false;
    const signature = base64Bytes(value);
    return signature?.length === expected.length && timingSafeEqual(signature, expected);
  });
}

export async function receiveResendEvent(request: Request) {
  const secret = runtimeEnv().RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook indisponível." }, { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Evento inválido." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > bodyLimit) {
        await reader.cancel();
        return Response.json({ error: "Evento excede o limite." }, { status: 413 });
      }
      chunks.push(chunk.value);
    }
  } catch {
    return Response.json({ error: "Evento inválido." }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
  const raw = Buffer.concat(chunks);
  if (!validSignature(raw, request.headers, secret)) return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  let event: EmailEvent;
  try {
    const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)) as { type?: unknown; created_at?: unknown; data?: { email_id?: unknown } };
    if (!payload || !emailEventTypes.includes(payload.type as EmailEventType) || typeof payload.data?.email_id !== "string" || !identifier.test(payload.data.email_id)
      || typeof payload.created_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(payload.created_at)
      || !Number.isFinite(Date.parse(payload.created_at))
      || new Date(`${payload.created_at.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== payload.created_at.slice(0, 10)) throw new Error("Invalid event");
    event = { event_id: request.headers.get("svix-id")!, provider_email_id: payload.data.email_id, event_type: payload.type as EmailEventType, occurred_at: new Date(payload.created_at).toISOString(), received_at: new Date().toISOString() };
  } catch {
    return Response.json({ error: "Evento inválido." }, { status: 400 });
  }
  try {
    await supabaseAdmin("email_delivery_events", { method: "POST", query: { on_conflict: "event_id" }, prefer: "resolution=ignore-duplicates,return=minimal", body: event });
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Não foi possível registrar o evento." }, { status: 500 });
  }
}

type DeliveryRow = {
  id: string; kind: string; audience: string; status: string; created_at: string;
  sent_at: string | null; send_claimed_at: string | null; provider_message_id: string | null; last_error: string | null;
};
type ObservationRow = {
  provider_email_id: string; event_total: number;
  accepted_at: string | null; delivered_at: string | null; opened_at: string | null; clicked_at: string | null;
  delayed_at: string | null; failed_at: string | null; bounced_at: string | null; complained_at: string | null; suppressed_at: string | null;
};
const reviewIssues = ["provider_response_ambiguous", "provider_id_missing", "send_result_unknown"] as const;

export async function memberEmailCommunications(memberId: string) {
  const [deliveries, total] = await Promise.all([
    supabaseAdmin<DeliveryRow[]>("billing_email_deliveries", { query: { select: "id,kind,audience,status,created_at,sent_at,send_claimed_at,provider_message_id,last_error", member_id: `eq.${memberId}`, order: "created_at.desc,id.desc", limit: "12" } }),
    supabaseAdmin<number>("billing_email_deliveries", { method: "HEAD", count: true, query: { select: "id", member_id: `eq.${memberId}` } }),
  ]);
  const ids = deliveries.map((row) => row.provider_message_id).filter((id): id is string => typeof id === "string" && identifier.test(id));
  const observations = ids.length ? await supabaseAdmin<ObservationRow[]>("email_delivery_observations", { query: { select: "provider_email_id,event_total,accepted_at,delivered_at,opened_at,clicked_at,delayed_at,failed_at,bounced_at,complained_at,suppressed_at", provider_email_id: `in.(${ids.join(",")})`, limit: "12" } }) : [];
  const byId = new Map(observations.map((row) => [row.provider_email_id, row]));
  const messages = await Promise.all(deliveries.map(async (row) => {
    const providerId = typeof row.provider_message_id === "string" && identifier.test(row.provider_message_id) ? row.provider_message_id : null;
    const observed = providerId ? byId.get(providerId) : undefined;
    const events = providerId ? await supabaseAdmin<Array<{ event_type: EmailEventType; occurred_at: string }>>("email_delivery_events", { query: { select: "event_type,occurred_at", provider_email_id: `eq.${providerId}`, order: "occurred_at.desc,event_id.desc", limit: "12" } }) : [];
    const eventTotal = Number(observed?.event_total || 0);
    return {
      id: row.id, kind: row.kind, audience: row.audience, sendingStatus: row.status, createdAt: row.created_at,
      acceptedAt: row.sent_at || observed?.accepted_at || null, sendClaimedAt: row.send_claimed_at,
      deliveryIssue: row.send_claimed_at && row.status !== "sent" ? reviewIssues.includes(row.last_error as typeof reviewIssues[number]) ? row.last_error as typeof reviewIssues[number] : "send_result_unknown" : null,
      correlationAvailable: Boolean(providerId),
      recipientServerDeliveredAt: observed?.delivered_at || null, openedAt: observed?.opened_at || null, clickedAt: observed?.clicked_at || null,
      delayedAt: observed?.delayed_at || null, failedAt: observed?.failed_at || null, bouncedAt: observed?.bounced_at || null,
      complainedAt: observed?.complained_at || null, providerSuppressedAt: observed?.suppressed_at || null,
      eventTotal, eventsTruncated: eventTotal > events.length,
      events: events.map((event) => ({ type: event.event_type, occurredAt: event.occurred_at })),
    };
  }));
  return { total, truncated: total > messages.length, messages };
}

export type MemberEmailCommunications = Awaited<ReturnType<typeof memberEmailCommunications>>;
