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

const receivedEvents = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

export async function POST(request: Request) {
  const configuredToken = runtimeEnv().ASAAS_WEBHOOK_TOKEN;
  const receivedToken = request.headers.get("asaas-access-token");
  if (!configuredToken || receivedToken !== configuredToken) {
    return Response.json({ received: false }, { status: 401 });
  }

  const payload = await request.json() as AsaasEvent;
  if (!payload.id || !payload.event) return Response.json({ received: false }, { status: 400 });

  try {
    const existing = await supabaseAdmin<Array<{ id: string }>>("webhook_events", {
      query: { select: "id", id: `eq.${payload.id}`, limit: "1" },
    });
    if (existing[0]) return Response.json({ received: true, duplicate: true });
    const payment = payload.payment;
    const memberId = payment?.externalReference || payload.subscription?.externalReference;
    if (!memberId) return Response.json({ received: true, reconciled: false });
    const subscriptions = await supabaseAdmin<Array<{ id: string }>>("subscriptions", {
      query: { select: "id", member_id: `eq.${memberId}`, limit: "1" },
    });
    const subscription = subscriptions[0];

    if (payment?.id) {
      await supabaseAdmin("payments", {
        method: "POST",
        query: { on_conflict: "asaas_payment_id" },
        prefer: "resolution=merge-duplicates,return=minimal",
        body: {
          member_id: memberId, subscription_id: subscription?.id || null, asaas_payment_id: payment.id,
          status: payload.event, value_cents: Math.round((payment.value || 0) * 100), due_date: payment.dueDate || null,
          paid_at: payment.paymentDate || payment.clientPaymentDate || null, invoice_url: payment.invoiceUrl || null,
          payload: payment, updated_at: new Date().toISOString(),
        },
      });
    }

    const asaasSubscriptionId = payment?.subscription || payload.subscription?.id;
    if (subscription && asaasSubscriptionId) {
      await supabaseAdmin("subscriptions", {
        method: "PATCH", query: { id: `eq.${subscription.id}` },
        body: { asaas_subscription_id: asaasSubscriptionId, updated_at: new Date().toISOString() },
      });
    }

    if (receivedEvents.has(payload.event)) {
      await Promise.all([
        supabaseAdmin("members", {
          method: "PATCH", query: { id: `eq.${memberId}` },
          body: { participation_status: "active", joined_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        }),
        supabaseAdmin("subscriptions", {
          method: "PATCH", query: { member_id: `eq.${memberId}` },
          body: { status: "active", overdue_since: null, next_due_date: payment?.dueDate || null, updated_at: new Date().toISOString() },
        }),
      ]);
    } else if (payload.event === "PAYMENT_OVERDUE") {
      await Promise.all([
        supabaseAdmin("members", {
          method: "PATCH", query: { id: `eq.${memberId}` },
          body: { participation_status: "pending_payment", updated_at: new Date().toISOString() },
        }),
        supabaseAdmin("subscriptions", {
          method: "PATCH", query: { member_id: `eq.${memberId}` },
          body: { status: "past_due", overdue_since: payment?.dueDate || new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() },
        }),
      ]);
    } else if (["PAYMENT_REFUNDED", "PAYMENT_DELETED"].includes(payload.event)) {
      await supabaseAdmin("members", {
        method: "PATCH", query: { id: `eq.${memberId}` },
        body: { participation_status: "pending_payment", updated_at: new Date().toISOString() },
      });
    }

    await supabaseAdmin("webhook_events", {
      method: "POST", body: { id: payload.id, event_type: payload.event, payload },
    });

    return Response.json({ received: true, reconciled: true });
  } catch (error) {
    if (error instanceof SupabaseRequestError && error.status === 409) {
      return Response.json({ received: true, duplicate: true });
    }
    return Response.json({ received: false }, { status: 500 });
  }
}
