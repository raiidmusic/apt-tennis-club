import { asaasRequest } from "./asaas";
import { sendBillingTransitionEmails } from "./apt-email";
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

type AsaasCustomerSnapshot = {
  id?: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
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
type LocalMember = {
  id: string;
  name: string;
  email: string;
  cpf_last4: string | null;
  participation_status: string;
  joined_at: string | null;
};
type LocalPaymentReference = { asaas_payment_id: string };

async function readJson<T>(response: Response, message: string) {
  if (!response.ok) throw new SupabaseRequestError(message, 502);
  return response.json() as Promise<T>;
}

function normalizedName(value = "") {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizedEmail(value = "") {
  return value.trim().toLowerCase();
}

export async function reconcileMemberBilling(memberId: string, hints: { checkoutId?: string } = {}) {
  const [member, localSubscription, localPayment] = await Promise.all([
    supabaseAdmin<LocalMember[]>("members", {
      query: { select: "id,name,email,cpf_last4,participation_status,joined_at", id: `eq.${memberId}`, limit: "1" },
    }).then((rows) => rows[0]),
    supabaseAdmin<LocalSubscription[]>("subscriptions", {
      query: { select: "id,asaas_customer_id,asaas_subscription_id,asaas_checkout_id,status,amount_cents,next_due_date,current_period_end", member_id: `eq.${memberId}`, limit: "1" },
    }).then((rows) => rows[0]),
    supabaseAdmin<LocalPaymentReference[]>("payments", {
      query: { select: "asaas_payment_id", member_id: `eq.${memberId}`, order: "created_at.desc", limit: "1" },
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
  if (!providerSubscription && localSubscription.asaas_customer_id) {
    const query = new URLSearchParams({ customer: localSubscription.asaas_customer_id, limit: "1", sort: "dateCreated", order: "desc" });
    const response = await asaasRequest(`/subscriptions?${query}`);
    providerSubscription = (await readJson<Collection<AsaasSubscriptionSnapshot>>(response, "O Asaas não respondeu à busca da assinatura do cliente.")).data?.[0] || null;
  }
  let recoveredCustomerId: string | undefined;
  if (!providerSubscription && !localSubscription.asaas_customer_id) {
    const emailQuery = new URLSearchParams({ email: member.email, limit: "10" });
    const emailResponse = await asaasRequest(`/customers?${emailQuery}`);
    const emailCustomers = (await readJson<Collection<AsaasCustomerSnapshot>>(emailResponse, "O Asaas não respondeu à recuperação do cliente.")).data || [];
    const emailMatches = emailCustomers.filter((customer) => customer.id && normalizedEmail(customer.email) === normalizedEmail(member.email));
    if (emailMatches.length === 1) recoveredCustomerId = emailMatches[0].id;

    if (!recoveredCustomerId && member.cpf_last4) {
      const nameQuery = new URLSearchParams({ name: member.name, limit: "10" });
      const nameResponse = await asaasRequest(`/customers?${nameQuery}`);
      const nameCustomers = (await readJson<Collection<AsaasCustomerSnapshot>>(nameResponse, "O Asaas não respondeu à recuperação do cliente.")).data || [];
      const nameMatches = nameCustomers.filter((customer) => customer.id
        && normalizedName(customer.name) === normalizedName(member.name)
        && (customer.cpfCnpj || "").replace(/\D/g, "").endsWith(member.cpf_last4 || ""));
      if (nameMatches.length === 1) recoveredCustomerId = nameMatches[0].id;
    }

    if (recoveredCustomerId) {
      const subscriptionQuery = new URLSearchParams({ customer: recoveredCustomerId, limit: "1", sort: "dateCreated", order: "desc" });
      const subscriptionResponse = await asaasRequest(`/subscriptions?${subscriptionQuery}`);
      providerSubscription = (await readJson<Collection<AsaasSubscriptionSnapshot>>(subscriptionResponse, "O Asaas não respondeu à assinatura recuperada.")).data?.[0] || null;
    }
  }
  const checkoutId = hints.checkoutId || localSubscription.asaas_checkout_id || undefined;
  const paymentPaths = providerSubscription?.id
    ? [`/subscriptions/${encodeURIComponent(providerSubscription.id)}/payments`]
    : [
        ...(checkoutId ? [`/payments?${new URLSearchParams({ checkoutSession: checkoutId, limit: "24" })}`] : []),
        ...(recoveredCustomerId ? [`/payments?${new URLSearchParams({ customer: recoveredCustomerId, limit: "24" })}`] : []),
        `/payments?${new URLSearchParams({ externalReference: memberId, limit: "24" })}`,
      ];
  let payments: AsaasPaymentSnapshot[] = [];
  for (const paymentPath of paymentPaths) {
    const paymentResponse = await asaasRequest(paymentPath);
    payments = (await readJson<Collection<AsaasPaymentSnapshot>>(paymentResponse, "O Asaas não respondeu à conciliação das cobranças.")).data || [];
    if (payments.length) break;
  }
  if (!payments.length && localPayment?.asaas_payment_id) {
    const paymentResponse = await asaasRequest(`/payments/${encodeURIComponent(localPayment.asaas_payment_id)}`);
    if (paymentResponse.ok) payments = [await paymentResponse.json() as AsaasPaymentSnapshot];
    else if (paymentResponse.status !== 404) throw new SupabaseRequestError("O Asaas não respondeu à cobrança conciliada.", 502);
  }

  if (!providerSubscription && payments[0]?.subscription) {
    const response = await asaasRequest(`/subscriptions/${encodeURIComponent(payments[0].subscription)}`);
    if (response.ok) providerSubscription = await response.json() as AsaasSubscriptionSnapshot;
  }

  const snapshots = payments.filter((payment): payment is AsaasPaymentSnapshot & { id: string } => Boolean(payment.id));
  const latest = [...snapshots].sort((a, b) => (b.dueDate || b.dateCreated || "").localeCompare(a.dueDate || a.dateCreated || ""))[0];
  const previousLatest = latest
    ? (await supabaseAdmin<Array<{ status?: string }>>("payments", {
      query: { select: "status", asaas_payment_id: `eq.${latest.id}`, limit: "1" },
    }))[0]
    : undefined;
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

  const latestState = asaasPaymentState(latest?.status);
  const previousLatestState = asaasPaymentState(previousLatest?.status);
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
        asaas_customer_id: providerSubscription?.customer || recoveredCustomerId || localSubscription.asaas_customer_id,
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

  if (latest?.id && latestState.paid && !previousLatestState.paid) {
    await sendBillingTransitionEmails({ kind: "confirmed", member, paymentId: latest.id, providerStatus: latestState.normalized });
  } else if (latest?.id && latestState.failed && !previousLatestState.failed) {
    await sendBillingTransitionEmails({ kind: "attention", member, paymentId: latest.id, providerStatus: latestState.normalized });
  }

  return { found: Boolean(providerSubscription || snapshots.length), paymentCount: snapshots.length, active: nextMemberStatus === "active" };
}
