import { asaasRequest } from "./asaas";
import { asaasPaymentState } from "./billing-state";
import { supabaseAdmin, SupabaseRequestError } from "./supabase-server";

export type AsaasPaymentSnapshot = {
  id?: string;
  externalReference?: string;
  subscription?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  dateCreated?: string;
};

type AsaasSubscriptionSnapshot = {
  id?: string;
  customer?: string;
  status?: string;
  value?: number;
  nextDueDate?: string;
};

type Collection<T> = { data?: T[] };
type LocalSubscription = {
  id: string;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  asaas_checkout_id: string | null;
  status: string;
  amount_cents: number;
  next_due_date: string | null;
  current_period_end: string | null;
};
type LocalMember = { id: string; participation_status: string; joined_at: string | null };

async function readJson<T>(response: Response, message: string) {
  if (!response.ok) throw new SupabaseRequestError(message, 502);
  return response.json() as Promise<T>;
}

export async function reconcileMemberBilling(memberId: string, hints: { checkoutId?: string } = {}) {
  const [member, localSubscription] = await Promise.all([
    supabaseAdmin<LocalMember[]>("members", {
      query: { select: "id,participation_status,joined_at", id: `eq.${memberId}`, limit: "1" },
    }).then((rows) => rows[0]),
    supabaseAdmin<LocalSubscription[]>("subscriptions", {
      query: { select: "id,asaas_customer_id,asaas_subscription_id,asaas_checkout_id,status,amount_cents,next_due_date,current_period_end", member_id: `eq.${memberId}`, limit: "1" },
    }).then((rows) => rows[0]),
  ]);
  if (!member || !localSubscription) throw new SupabaseRequestError("Cadastro financeiro não encontrado.", 404);

  let providerSubscription: AsaasSubscriptionSnapshot | null = null;
  if (localSubscription.asaas_subscription_id) {
    const response = await asaasRequest(`/subscriptions/${encodeURIComponent(localSubscription.asaas_subscription_id)}`);
    if (response.ok) providerSubscription = await response.json() as AsaasSubscriptionSnapshot;
    else if (response.status !== 404) throw new SupabaseRequestError("O Asaas não respondeu à conciliação da assinatura.", 502);
  }
  if (!providerSubscription) {
    const query = new URLSearchParams({ externalReference: memberId, limit: "1", sort: "dateCreated", order: "desc" });
    const response = await asaasRequest(`/subscriptions?${query}`);
    providerSubscription = (await readJson<Collection<AsaasSubscriptionSnapshot>>(response, "O Asaas não respondeu à busca da assinatura.")).data?.[0] || null;
  }
  const checkoutId = hints.checkoutId || localSubscription.asaas_checkout_id || undefined;
  const paymentPaths = providerSubscription?.id
    ? [`/subscriptions/${encodeURIComponent(providerSubscription.id)}/payments`]
    : [
        ...(checkoutId ? [`/payments?${new URLSearchParams({ checkoutSession: checkoutId, limit: "24" })}`] : []),
        `/payments?${new URLSearchParams({ externalReference: memberId, limit: "24" })}`,
      ];
  let payments: AsaasPaymentSnapshot[] = [];
  for (const paymentPath of paymentPaths) {
    const paymentResponse = await asaasRequest(paymentPath);
    payments = (await readJson<Collection<AsaasPaymentSnapshot>>(paymentResponse, "O Asaas não respondeu à conciliação das cobranças.")).data || [];
    if (payments.length) break;
  }

  if (!providerSubscription && payments[0]?.subscription) {
    const response = await asaasRequest(`/subscriptions/${encodeURIComponent(payments[0].subscription)}`);
    if (response.ok) providerSubscription = await response.json() as AsaasSubscriptionSnapshot;
  }

  const snapshots = payments.filter((payment): payment is AsaasPaymentSnapshot & { id: string } => Boolean(payment.id));
  await Promise.all(snapshots.map((payment) => {
    const state = asaasPaymentState(payment.status);
    return supabaseAdmin("payments", {
      method: "POST",
      query: { on_conflict: "asaas_payment_id" },
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        member_id: memberId,
        subscription_id: localSubscription.id,
        asaas_payment_id: payment.id,
        status: state.normalized || "PENDING",
        value_cents: Math.round((payment.value || 0) * 100),
        due_date: payment.dueDate || null,
        paid_at: payment.paymentDate || payment.clientPaymentDate || null,
        invoice_url: payment.invoiceUrl || null,
        payload: payment,
        updated_at: new Date().toISOString(),
      },
    });
  }));

  const latest = [...snapshots].sort((a, b) => (b.dueDate || b.dateCreated || "").localeCompare(a.dueDate || a.dateCreated || ""))[0];
  const latestState = asaasPaymentState(latest?.status);
  const protectedManualState = ["courtesy", "inactive", "cancelled", "cancellation_requested"].includes(member.participation_status);
  const nextMemberStatus = protectedManualState
    ? member.participation_status
    : latestState.paid ? "active" : latestState.failed ? "pending_payment" : member.participation_status;
  const nextSubscriptionStatus = latestState.paid ? "active" : latestState.failed ? "past_due" : localSubscription.status;
  const now = new Date().toISOString();

  await Promise.all([
    supabaseAdmin("subscriptions", {
      method: "PATCH",
      query: { id: `eq.${localSubscription.id}` },
      body: {
        asaas_subscription_id: providerSubscription?.id || localSubscription.asaas_subscription_id,
        asaas_customer_id: providerSubscription?.customer || localSubscription.asaas_customer_id,
        status: nextSubscriptionStatus,
        amount_cents: providerSubscription?.value ? Math.round(providerSubscription.value * 100) : localSubscription.amount_cents,
        next_due_date: providerSubscription?.nextDueDate || localSubscription.next_due_date,
        current_period_end: providerSubscription?.nextDueDate || localSubscription.current_period_end,
        overdue_since: latestState.failed ? latest?.dueDate || new Date().toISOString().slice(0, 10) : null,
        updated_at: now,
      },
    }),
    nextMemberStatus !== member.participation_status
      ? supabaseAdmin("members", {
        method: "PATCH",
        query: { id: `eq.${memberId}` },
        body: { participation_status: nextMemberStatus, joined_at: latestState.paid ? member.joined_at || now : member.joined_at, updated_at: now },
      })
      : Promise.resolve(),
  ]);

  return { found: Boolean(providerSubscription || snapshots.length), paymentCount: snapshots.length, active: nextMemberStatus === "active" };
}
