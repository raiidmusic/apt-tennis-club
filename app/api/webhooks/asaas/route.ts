import { asaasRequest } from "../../../../lib/asaas";
import { runtimeEnv, supabaseAdmin, SupabaseRequestError } from "../../../../lib/supabase-server";

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
};

type AsaasEvent = { id?: string; event?: string; payment?: AsaasPayment; subscription?: { id?: string; externalReference?: string } };
type StoredEvent = { id: string; processed_at: string | null };
type SubscriptionRow = { id: string };
type MemberRow = { id: string; joined_at: string | null };

const receivedEvents = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const failedEvents = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
]);

async function recordFailure(eventId: string, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 500) : "Falha de reconciliação";
  await supabaseAdmin("webhook_events", {
    method: "PATCH",
    query: { id: `eq.${eventId}` },
    body: { processing_error: message },
  }).catch(() => undefined);
}

export async function POST(request: Request) {
  const configuredToken = runtimeEnv().ASAAS_WEBHOOK_TOKEN;
  const receivedToken = request.headers.get("asaas-access-token");
  if (!configuredToken || receivedToken !== configuredToken) {
    return Response.json({ received: false }, { status: 401 });
  }

  const payload = await request.json() as AsaasEvent;
  if (!payload.id || !payload.event) return Response.json({ received: false }, { status: 400 });

  try {
    const existing = await supabaseAdmin<StoredEvent[]>("webhook_events", {
      query: { select: "id,processed_at", id: `eq.${payload.id}`, limit: "1" },
    });
    if (existing[0]?.processed_at) return Response.json({ received: true, duplicate: true });
    if (!existing[0]) {
      await supabaseAdmin("webhook_events", {
        method: "POST",
        query: { on_conflict: "id" },
        prefer: "resolution=ignore-duplicates,return=minimal",
        body: { id: payload.id, event_type: payload.event, payload, processed_at: null },
      });
    }

    let payment = payload.payment;
    if (payment?.id) {
      const providerPaymentResponse = await asaasRequest(`/payments/${encodeURIComponent(payment.id)}`);
      if (providerPaymentResponse.ok) {
        payment = { ...payment, ...(await providerPaymentResponse.json() as AsaasPayment) };
      } else if (!(payload.event === "PAYMENT_DELETED" && providerPaymentResponse.status === 404)) {
        throw new SupabaseRequestError("Não foi possível reconciliar a cobrança no Asaas.", 502);
      }
    }
    const paymentState = payment?.status?.toUpperCase() || "";
    const paymentIsReceived = paymentState
      ? ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(paymentState)
      : receivedEvents.has(payload.event);
    const paymentHasFailed = paymentState
      ? ["OVERDUE", "REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"].includes(paymentState)
      : failedEvents.has(payload.event);
    const memberId = payment?.externalReference || payload.subscription?.externalReference;
    if (!memberId) throw new SupabaseRequestError("Evento sem referência do membro.", 409);
    const member = (await supabaseAdmin<MemberRow[]>("members", {
      query: { select: "id,joined_at", id: `eq.${memberId}`, limit: "1" },
    }))[0];
    if (!member) throw new SupabaseRequestError("Membro referenciado não existe.", 409);
    const subscription = (await supabaseAdmin<SubscriptionRow[]>("subscriptions", {
      query: { select: "id", member_id: `eq.${memberId}`, limit: "1" },
    }))[0];
    if (!subscription) throw new SupabaseRequestError("Assinatura local não existe.", 409);

    if (payment?.id) {
      await supabaseAdmin("payments", {
        method: "POST",
        query: { on_conflict: "asaas_payment_id" },
        prefer: "resolution=merge-duplicates,return=minimal",
        body: {
          member_id: memberId,
          subscription_id: subscription.id,
          asaas_payment_id: payment.id,
          status: paymentState || payload.event,
          value_cents: Math.round((payment.value || 0) * 100),
          due_date: payment.dueDate || null,
          paid_at: payment.paymentDate || payment.clientPaymentDate || null,
          invoice_url: payment.invoiceUrl || null,
          payload: payment,
          updated_at: new Date().toISOString(),
        },
      });
    }

    const asaasSubscriptionId = payment?.subscription || payload.subscription?.id;
    let providerNextDueDate: string | null = null;
    if (asaasSubscriptionId) {
      if (paymentIsReceived) {
        const providerResponse = await asaasRequest(`/subscriptions/${encodeURIComponent(asaasSubscriptionId)}`);
        if (!providerResponse.ok) throw new SupabaseRequestError("Não foi possível reconciliar a assinatura no Asaas.", 502);
        const providerSubscription = await providerResponse.json() as { nextDueDate?: string };
        providerNextDueDate = providerSubscription.nextDueDate || null;
      }
      await supabaseAdmin("subscriptions", {
        method: "PATCH",
        query: { id: `eq.${subscription.id}` },
        body: { asaas_subscription_id: asaasSubscriptionId, updated_at: new Date().toISOString() },
      });
    }

    if (paymentIsReceived) {
      await Promise.all([
        supabaseAdmin("members", {
          method: "PATCH",
          query: { id: `eq.${memberId}` },
          body: { participation_status: "active", joined_at: member.joined_at || new Date().toISOString(), updated_at: new Date().toISOString() },
        }),
        supabaseAdmin("subscriptions", {
          method: "PATCH",
          query: { id: `eq.${subscription.id}` },
          body: {
            status: "active",
            overdue_since: null,
            next_due_date: providerNextDueDate,
            current_period_end: providerNextDueDate,
            updated_at: new Date().toISOString(),
          },
        }),
      ]);
    } else if (paymentHasFailed) {
      const overdueSince = paymentState === "OVERDUE" || payload.event === "PAYMENT_OVERDUE"
        ? payment?.dueDate || new Date().toISOString().slice(0, 10)
        : null;
      await Promise.all([
        supabaseAdmin("members", {
          method: "PATCH",
          query: { id: `eq.${memberId}` },
          body: { participation_status: "pending_payment", updated_at: new Date().toISOString() },
        }),
        supabaseAdmin("subscriptions", {
          method: "PATCH",
          query: { id: `eq.${subscription.id}` },
          body: { status: "past_due", overdue_since: overdueSince, updated_at: new Date().toISOString() },
        }),
      ]);
    }

    await supabaseAdmin("webhook_events", {
      method: "PATCH",
      query: { id: `eq.${payload.id}` },
      body: { event_type: payload.event, payload, processed_at: new Date().toISOString(), processing_error: null },
    });
    return Response.json({ received: true, reconciled: true });
  } catch (error) {
    await recordFailure(payload.id, error);
    return Response.json({ received: false }, { status: 500 });
  }
}
