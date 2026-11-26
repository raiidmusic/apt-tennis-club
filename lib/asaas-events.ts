import { asaasRequest } from "./asaas";
import { assertBillingOwnership, claimBillingCustomer, reconcileMemberBilling } from "./billing-reconciliation";
import { runtimeEnv, sha256, supabaseAdmin, SupabaseRequestError } from "./supabase-server";

type AsaasPayment = {
  id?: string;
  externalReference?: string;
  subscription?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  customer?: string;
  checkoutSession?: string;
};

export type AsaasEvent = {
  id: string;
  event: string;
  payment?: AsaasPayment;
  subscription?: { id?: string; externalReference?: string };
  checkout?: { id?: string; status?: string; externalReference?: string; customer?: string };
};
export type StoredEvent = { id: string; processed_at: string | null; payload?: AsaasEvent; attempt_count: number; next_attempt_at: string; last_attempt_at: string | null };

export const MAX_WEBHOOK_ATTEMPTS = 10;
type SubscriptionRow = { id: string; member_id?: string; amount_cents?: number; asaas_customer_id?: string | null };
type MemberRow = { id: string; name: string; email: string; joined_at: string | null };

function nextAttempt(attempt: number) {
  return new Date(Date.now() + Math.min(360, 5 * 2 ** Math.min(attempt - 1, 7)) * 60_000).toISOString();
}

async function recordFailure(eventId: string, attempt: number) {
  // Persist only a safe category; provider bodies and secrets never enter operation evidence.
  await supabaseAdmin("webhook_events", {
    method: "PATCH", query: { id: `eq.${eventId}`, processed_at: "is.null", attempt_count: `eq.${attempt}` },
    body: { processing_error: "Falha de reconciliação; revisão/repetição pendente.", next_attempt_at: nextAttempt(attempt) },
    signal: AbortSignal.timeout(2_000),
  }).catch(() => undefined);
}

async function resolveMemberId(payment: AsaasPayment | undefined, event: AsaasEvent, signal?: AbortSignal) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  const directReference = payment?.externalReference || event.subscription?.externalReference;
  if (directReference) return directReference;

  const providerLinks: Array<Record<string, string>> = [];
  if (event.subscription?.id) providerLinks.push({ asaas_subscription_id: `eq.${event.subscription.id}` });
  if (payment?.subscription) providerLinks.push({ asaas_subscription_id: `eq.${payment.subscription}` });
  if (payment?.checkoutSession) providerLinks.push({ asaas_checkout_id: `eq.${payment.checkoutSession}` });
  if (payment?.customer) providerLinks.push({ asaas_customer_id: `eq.${payment.customer}` });
  for (const providerLink of providerLinks) {
    const subscription = (await db<SubscriptionRow[]>("subscriptions", {
      query: { select: "id,member_id", ...providerLink, limit: "1" },
    }))[0];
    if (subscription?.member_id) return subscription.member_id;
  }

  if (!payment?.customer || typeof payment.value !== "number") return undefined;
  const cpfSecret = runtimeEnv().CPF_HASH_SECRET;
  if (!cpfSecret) return undefined;
  const customerResponse = await asaasRequest(`/customers/${encodeURIComponent(payment.customer)}`, { signal });
  if (customerResponse.status === 404) return undefined;
  if (!customerResponse.ok) throw new SupabaseRequestError("Não foi possível validar o cliente da cobrança.", 502);
  const customer = await customerResponse.json() as { cpfCnpj?: string; externalReference?: string };
  if (customer.externalReference) return customer.externalReference;
  const customerCpf = (customer.cpfCnpj || "").replace(/\D/g, "");
  if (customerCpf.length !== 11) return undefined;
  const cpfHash = await sha256(`${cpfSecret}:${customerCpf}`);
  const matchingMembers = await db<Array<{ id: string }>>("members", {
    query: { select: "id", cpf_hash: `eq.${cpfHash}`, limit: "2" },
  });
  if (matchingMembers.length !== 1) return undefined;
  const subscription = (await db<SubscriptionRow[]>("subscriptions", {
    query: { select: "id,member_id,amount_cents,asaas_customer_id", member_id: `eq.${matchingMembers[0].id}`, limit: "1" },
  }))[0];
  if (!subscription || subscription.amount_cents !== Math.round(payment.value * 100)) return undefined;
  await assertBillingOwnership(matchingMembers[0].id, payment, signal);
  if (subscription.asaas_customer_id && subscription.asaas_customer_id !== payment.customer) throw new SupabaseRequestError("O membro já possui outro cliente financeiro.", 409);
  if (!subscription.asaas_customer_id) {
    await claimBillingCustomer(matchingMembers[0].id, subscription, payment.customer || null, signal);
  }
  return matchingMembers[0].id;
}

export async function processAsaasEvent(payload: AsaasEvent, signal?: AbortSignal) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  let attempt = 0;
  try {
    const existing = (await db<StoredEvent[]>("webhook_events", {
      query: { select: "id,processed_at,payload,attempt_count,next_attempt_at", id: `eq.${payload.id}`, limit: "1" },
    }))[0];
    if (existing?.processed_at) return { received: true, duplicate: true };
    if (!existing || existing.attempt_count >= MAX_WEBHOOK_ATTEMPTS || new Date(existing.next_attempt_at).getTime() > Date.now()) return { received: true, deferred: true };
    payload = { ...(existing.payload || payload), id: existing.id };
    attempt = existing.attempt_count + 1;
    // Conditional claim also prevents an incoming replay and cron from processing the same event concurrently.
    const claimed = await db<StoredEvent[]>("webhook_events", {
      method: "PATCH", prefer: "return=representation",
      query: { id: `eq.${payload.id}`, processed_at: "is.null", attempt_count: `eq.${existing.attempt_count}`, next_attempt_at: `lte.${new Date().toISOString()}` },
      body: { attempt_count: attempt, last_attempt_at: new Date().toISOString(), next_attempt_at: nextAttempt(attempt) },
    });
    if (!claimed.length) return { received: true, deferred: true };
    if (payload.event.startsWith("CHECKOUT_")) {
      const checkoutId = payload.checkout?.id;
      let memberId = payload.checkout?.externalReference;
      if (!memberId && checkoutId) {
        const subscription = (await db<SubscriptionRow[]>("subscriptions", {
          query: { select: "id,member_id", asaas_checkout_id: `eq.${checkoutId}`, limit: "1" },
        }))[0];
        memberId = subscription?.member_id;
      }
      if (!memberId) throw new SupabaseRequestError("Checkout sem referência do membro.", 409);
      if (payload.event === "CHECKOUT_PAID") {
        if (!checkoutId) throw new SupabaseRequestError("Evento pago sem identificador do Checkout.", 409);
        const [verifiedSubscription, member] = await Promise.all([
          db<SubscriptionRow[]>("subscriptions", {
            query: { select: "id,member_id,asaas_customer_id", member_id: `eq.${memberId}`, asaas_checkout_id: `eq.${checkoutId}`, limit: "1" },
          }).then((rows) => rows[0]),
          db<MemberRow[]>("members", {
            query: { select: "id,name,email,joined_at", id: `eq.${memberId}`, limit: "1" },
          }).then((rows) => rows[0]),
        ]);
        if (!verifiedSubscription || !member) throw new SupabaseRequestError("Checkout pago não pertence a um membro do APT.", 409);
        if (verifiedSubscription.asaas_customer_id && payload.checkout?.customer && verifiedSubscription.asaas_customer_id !== payload.checkout.customer) throw new SupabaseRequestError("Checkout aponta para outro cliente financeiro.", 409);
        await assertBillingOwnership(memberId, { checkoutSession: checkoutId, customer: payload.checkout?.customer }, signal);
        if (payload.checkout?.customer) {
          await claimBillingCustomer(memberId, verifiedSubscription, payload.checkout.customer, signal);
        }
        await reconcileMemberBilling(memberId, { checkoutId, signal });
      }
      await db("webhook_events", {
        method: "PATCH",
        query: { id: `eq.${payload.id}` },
        body: { event_type: payload.event, payload, processed_at: new Date().toISOString(), processing_error: null },
      });
      return { received: true, reconciled: payload.event === "CHECKOUT_PAID" };
    }

    let payment = payload.payment;
    if (payment?.id) {
      const providerPaymentResponse = await asaasRequest(`/payments/${encodeURIComponent(payment.id)}`, { signal });
      if (providerPaymentResponse.ok) {
        payment = { ...payment, ...(await providerPaymentResponse.json() as AsaasPayment) };
      } else if (payload.event === "PAYMENT_DELETED" && providerPaymentResponse.status === 404) {
        payment = { ...payment, status: "DELETED" };
      } else {
        throw new SupabaseRequestError("Não foi possível reconciliar a cobrança no Asaas.", 502);
      }
    }
    const memberId = await resolveMemberId(payment, payload, signal);
    if (!memberId) {
      await db("webhook_events", {
        method: "PATCH",
        query: { id: `eq.${payload.id}` },
        body: {
          event_type: payload.event,
          payload,
          processed_at: new Date().toISOString(),
          processing_error: "Evento sem vínculo financeiro APT; nenhuma transição foi aplicada.",
        },
      });
      return { received: true, ignored: true };
    }
    const member = (await db<MemberRow[]>("members", {
      query: { select: "id,name,email,joined_at", id: `eq.${memberId}`, limit: "1" },
    }))[0];
    if (!member) throw new SupabaseRequestError("Membro referenciado não existe.", 409);
    const subscription = (await db<SubscriptionRow[]>("subscriptions", {
      query: { select: "id,member_id", member_id: `eq.${memberId}`, limit: "1" },
    }))[0];
    if (!subscription) throw new SupabaseRequestError("Assinatura local não existe.", 409);

    if (payload.event.startsWith("SUBSCRIPTION_") && !payment?.id) {
      await assertBillingOwnership(memberId, { subscription: payload.subscription?.id, externalReference: payload.subscription?.externalReference }, signal);
      await reconcileMemberBilling(memberId, { signal });
    } else {
      if (!payment?.id) throw new SupabaseRequestError("Evento sem identificador de cobrança.", 409);
      await assertBillingOwnership(memberId, payment, signal);
      await reconcileMemberBilling(memberId, { paymentSnapshot: payment, signal });
    }

    await db("webhook_events", {
      method: "PATCH",
      query: { id: `eq.${payload.id}` },
      body: { event_type: payload.event, payload, processed_at: new Date().toISOString(), processing_error: null },
    });
    return { received: true, reconciled: true };
  } catch {
    if (attempt) await recordFailure(payload.id, attempt);
    return { received: false };
  }
}

export async function processPendingAsaasEvents(signal: AbortSignal, limit = 10) {
  const pending = await supabaseAdmin<StoredEvent[]>("webhook_events", {
    query: { select: "id,processed_at,payload,attempt_count,next_attempt_at", processed_at: "is.null", attempt_count: `lt.${MAX_WEBHOOK_ATTEMPTS}`, next_attempt_at: `lte.${new Date().toISOString()}`, order: "last_attempt_at.asc.nullsfirst,received_at.asc", limit: String(limit) }, signal,
  });
  let processed = 0, failed = 0, checked = 0;
  for (let index = 0; index < pending.length && !signal.aborted; index += 2) {
    const results = await Promise.all(pending.slice(index, index + 2).map((stored) => {
      // Malformed stored payloads consume bounded attempts too, so they cannot pin the queue.
      return processAsaasEvent({ ...stored.payload, id: stored.id, event: stored.payload?.event || "INVALID" }, signal);
    }));
    checked += results.length;
    processed += results.filter((result) => result.received && !('deferred' in result)).length;
    failed += results.filter((result) => !result.received).length;
  }
  return { checked, processed, failed };
}
