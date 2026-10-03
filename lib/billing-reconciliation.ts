import { asaasPaymentHistory, asaasRequest, type AsaasPaymentSnapshot } from "./asaas";
import { sendBillingTransitionEmails } from "./apt-email";
import { asaasPaymentState, billingDecision, saoPauloDate } from "./billing-state";
import { supabaseAdmin, SupabaseRequestError } from "./supabase-server";

type AsaasSubscriptionSnapshot = {
  externalReference?: string;
  id?: string;
  customer?: string;
  status?: string;
  value?: number;
  nextDueDate?: string;
};

type AsaasCustomerSnapshot = {
  externalReference?: string;
  id?: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
};

type Collection<T> = { data?: T[]; hasMore?: boolean };
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
type LocalPaymentReference = { asaas_payment_id: string; status: string; value_cents: number; due_date: string | null; paid_at: string | null; invoice_url: string | null };

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

// Payment IDs have a database unique constraint; never merge an ownership field.
export async function assertBillingOwnership(memberId: string, input: { id?: string; externalReference?: string; customer?: string; subscription?: string; checkoutSession?: string } | Array<{ id?: string; externalReference?: string; customer?: string; subscription?: string; checkoutSession?: string }>, signal?: AbortSignal) {
  const links = Array.isArray(input) ? input : [input];
  if (links.some((link) => link.externalReference && link.externalReference !== memberId)) throw new SupabaseRequestError("A referência financeira pertence a outro cadastro.", 409);
  const checks = ([ ["payments", "asaas_payment_id", "id"], ["subscriptions", "asaas_customer_id", "customer"], ["subscriptions", "asaas_subscription_id", "subscription"], ["subscriptions", "asaas_checkout_id", "checkoutSession"] ] as const)
    .map(([resource, column, key]) => {
      const values = [...new Set(links.map((link) => link[key]).filter((value): value is string => Boolean(value)))];
      return values.length ? supabaseAdmin<Array<{ member_id: string }>>(resource, { query: { select: "member_id", [column]: `in.(${values.join(",")})`, limit: "1000" }, signal }) : Promise.resolve([]);
    });
  if ((await Promise.all(checks)).flat().some((row) => row.member_id !== memberId)) throw new SupabaseRequestError("O vínculo financeiro já pertence a outro atleta.", 409);
}

// A unique customer index prevents shared ownership; this CAS also prevents reassignment of the same row.
export async function claimBillingCustomer(memberId: string, subscription: { id: string; asaas_customer_id?: string | null; status?: string; checkout_attempted_at?: string | null }, customerId: string | null, signal?: AbortSignal) {
  const rows = await supabaseAdmin<Array<{ id: string; member_id: string; asaas_customer_id: string | null }>>("subscriptions", {
    method: "PATCH", prefer: "return=representation",
    query: { id: `eq.${subscription.id}`, member_id: `eq.${memberId}`, asaas_customer_id: subscription.asaas_customer_id ? `eq.${subscription.asaas_customer_id}` : "is.null", ...(subscription.status ? { status: `eq.${subscription.status}` } : {}), ...("checkout_attempted_at" in subscription ? { checkout_attempted_at: subscription.checkout_attempted_at ? `eq.${subscription.checkout_attempted_at}` : "is.null" } : {}) },
    body: { asaas_customer_id: customerId }, signal,
  });
  if (rows.length !== 1 || rows[0].member_id !== memberId || rows[0].asaas_customer_id !== customerId) throw new SupabaseRequestError("O vínculo financeiro mudou durante a conciliação; atualize antes de continuar.", 409);
}

export async function reconcileMemberBilling(memberId: string, hints: { checkoutId?: string; paymentId?: string; paymentSnapshot?: AsaasPaymentSnapshot; signal?: AbortSignal } = {}) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal: hints.signal });
  const provider = (path: string) => asaasRequest(path, { signal: hints.signal });
  const [member, localSubscription, localPayments] = await Promise.all([
    db<LocalMember[]>("members", {
      query: { select: "id,name,email,cpf_last4,participation_status,joined_at", id: `eq.${memberId}`, limit: "1" },
    }).then((rows) => rows[0]),
    db<LocalSubscription[]>("subscriptions", {
      query: { select: "id,asaas_customer_id,asaas_subscription_id,asaas_checkout_id,status,amount_cents,next_due_date,current_period_end", member_id: `eq.${memberId}`, limit: "1" },
    }).then((rows) => rows[0]),
    db<LocalPaymentReference[]>("payments", {
      query: { select: "asaas_payment_id,status,value_cents,due_date,paid_at,invoice_url", member_id: `eq.${memberId}`, order: "created_at.desc", limit: "500" },
    }),
  ]);
  if (!member || !localSubscription) throw new SupabaseRequestError("Cadastro financeiro não encontrado.", 404);
  const localPayment = localPayments[0];
  const previousPayments = new Map(localPayments.map((payment) => [payment.asaas_payment_id, payment]));

  let providerSubscription: AsaasSubscriptionSnapshot | null = null;
  let providerSubscriptionMissing = false;
  if (localSubscription.asaas_subscription_id) {
    const response = await provider(`/subscriptions/${encodeURIComponent(localSubscription.asaas_subscription_id)}`);
    if (response.ok) providerSubscription = await response.json() as AsaasSubscriptionSnapshot;
    else if (response.status === 404) providerSubscriptionMissing = true;
    else if (response.status !== 404) throw new SupabaseRequestError("O Asaas não respondeu à conciliação da assinatura.", 502);
  }
  if (!providerSubscription) {
    const query = new URLSearchParams({ externalReference: memberId, limit: "1", sort: "dateCreated", order: "desc" });
    const response = await provider(`/subscriptions?${query}`);
    providerSubscription = (await readJson<Collection<AsaasSubscriptionSnapshot>>(response, "O Asaas não respondeu à busca da assinatura.")).data?.[0] || null;
  }
  if (!providerSubscription && localSubscription.asaas_customer_id) {
    const query = new URLSearchParams({ customer: localSubscription.asaas_customer_id, limit: "1", sort: "dateCreated", order: "desc" });
    const response = await provider(`/subscriptions?${query}`);
    providerSubscription = (await readJson<Collection<AsaasSubscriptionSnapshot>>(response, "O Asaas não respondeu à busca da assinatura do cliente.")).data?.[0] || null;
  }
  let recoveredCustomerId: string | undefined;
  if (!providerSubscription && !localSubscription.asaas_customer_id) {
    const emailQuery = new URLSearchParams({ email: member.email, limit: "10" });
    const emailResponse = await provider(`/customers?${emailQuery}`);
    const emailCustomers = (await readJson<Collection<AsaasCustomerSnapshot>>(emailResponse, "O Asaas não respondeu à recuperação do cliente.")).data || [];
    const emailMatches = emailCustomers.filter((customer) => customer.id && normalizedEmail(customer.email) === normalizedEmail(member.email));
    if (emailMatches.length === 1 && (!emailMatches[0].externalReference || emailMatches[0].externalReference === memberId)) recoveredCustomerId = emailMatches[0].id;

    if (!recoveredCustomerId && member.cpf_last4) {
      const nameQuery = new URLSearchParams({ name: member.name, limit: "10" });
      const nameResponse = await provider(`/customers?${nameQuery}`);
      const nameCustomers = (await readJson<Collection<AsaasCustomerSnapshot>>(nameResponse, "O Asaas não respondeu à recuperação do cliente.")).data || [];
      const nameMatches = nameCustomers.filter((customer) => customer.id
        && normalizedName(customer.name) === normalizedName(member.name)
        && (customer.cpfCnpj || "").replace(/\D/g, "").endsWith(member.cpf_last4 || ""));
      if (nameMatches.length === 1 && (!nameMatches[0].externalReference || nameMatches[0].externalReference === memberId)) recoveredCustomerId = nameMatches[0].id;
    }

    if (recoveredCustomerId) {
      const subscriptionQuery = new URLSearchParams({ customer: recoveredCustomerId, limit: "1", sort: "dateCreated", order: "desc" });
      const subscriptionResponse = await provider(`/subscriptions?${subscriptionQuery}`);
      providerSubscription = (await readJson<Collection<AsaasSubscriptionSnapshot>>(subscriptionResponse, "O Asaas não respondeu à assinatura recuperada.")).data?.[0] || null;
    }
  }
  if (providerSubscription) {
    await assertBillingOwnership(memberId, { externalReference: providerSubscription.externalReference, customer: providerSubscription.customer, subscription: providerSubscription.id }, hints.signal);
  }
  if (recoveredCustomerId) await assertBillingOwnership(memberId, { customer: recoveredCustomerId }, hints.signal);
  const checkoutId = hints.checkoutId || localSubscription.asaas_checkout_id || undefined;
  const paymentPaths = providerSubscription?.id
    ? [`/subscriptions/${encodeURIComponent(providerSubscription.id)}/payments`]
    : [
        ...(checkoutId ? [`/payments?${new URLSearchParams({ checkoutSession: checkoutId, limit: "24" })}`] : []),
        ...((recoveredCustomerId || localSubscription.asaas_customer_id)
          ? [`/payments?${new URLSearchParams({ customer: recoveredCustomerId || localSubscription.asaas_customer_id || "", limit: "24" })}`]
          : []),
        `/payments?${new URLSearchParams({ externalReference: memberId, limit: "24" })}`,
      ];
  let payments: AsaasPaymentSnapshot[] = [];
  if (hints.paymentId) {
    const paymentResponse = await provider(`/payments/${encodeURIComponent(hints.paymentId)}`);
    payments = [await readJson<AsaasPaymentSnapshot>(paymentResponse, "O Asaas não confirmou o Pix selecionado.")];
  }
  for (const paymentPath of paymentPaths) {
    const history = await asaasPaymentHistory(paymentPath, hints.signal);
    payments.push(...history);
  }
  if (!payments.length && localPayment?.asaas_payment_id) {
    const paymentResponse = await provider(`/payments/${encodeURIComponent(localPayment.asaas_payment_id)}`);
    if (paymentResponse.ok) payments = [await paymentResponse.json() as AsaasPaymentSnapshot];
    else if (paymentResponse.status !== 404) throw new SupabaseRequestError("O Asaas não respondeu à cobrança conciliada.", 502);
  }

  if (hints.paymentSnapshot && !payments.some((payment) => payment.id === hints.paymentSnapshot?.id)) payments.push(hints.paymentSnapshot);
  if (!providerSubscription && payments[0]?.subscription) {
    const response = await provider(`/subscriptions/${encodeURIComponent(payments[0].subscription)}`);
    if (response.ok) providerSubscription = await response.json() as AsaasSubscriptionSnapshot;
    else if (response.status === 404) providerSubscriptionMissing = true;
    else throw new SupabaseRequestError("O Asaas não respondeu à assinatura da cobrança.", 502);
  }

  if (providerSubscription) await assertBillingOwnership(memberId, { externalReference: providerSubscription.externalReference, customer: providerSubscription.customer, subscription: providerSubscription.id }, hints.signal);
  if (localSubscription.asaas_customer_id && providerSubscription?.customer && localSubscription.asaas_customer_id !== providerSubscription.customer) throw new SupabaseRequestError("A assinatura aponta para outro cliente financeiro.", 409);
  const snapshots = [...new Map(payments.filter((payment): payment is AsaasPaymentSnapshot & { id: string } => Boolean(payment.id)).map((payment) => [payment.id, payment])).values()];
  // Validate every payment before any write, so a conflicting collection is not partially imported.
  await assertBillingOwnership(memberId, snapshots, hints.signal);
  for (const payment of snapshots) {
    const customerId = providerSubscription?.customer || recoveredCustomerId || localSubscription.asaas_customer_id;
    if (customerId && payment.customer && customerId !== payment.customer) throw new SupabaseRequestError("A cobrança aponta para outro cliente financeiro.", 409);
    if (providerSubscription?.id && payment.subscription && providerSubscription.id !== payment.subscription) throw new SupabaseRequestError("A cobrança aponta para outra assinatura.", 409);
  }
  const customerId = providerSubscription?.customer || recoveredCustomerId || localSubscription.asaas_customer_id;
  await claimBillingCustomer(memberId, localSubscription, customerId, hints.signal);
  const latest = [...snapshots].sort((a, b) => (b.dueDate || b.dateCreated || "").localeCompare(a.dueDate || a.dateCreated || ""))[0];
  await Promise.all(snapshots.map(async (payment) => {
    const state = asaasPaymentState(payment.status);
    const body = {
      status: state.normalized || "PENDING", value_cents: Math.round((payment.value || 0) * 100),
      due_date: payment.dueDate || null, paid_at: payment.paymentDate || payment.clientPaymentDate || null,
      invoice_url: payment.invoiceUrl || null, payload: payment, updated_at: new Date().toISOString(),
    };
    const previous = previousPayments.get(payment.id);
    if (previous && previous.status === body.status && previous.value_cents === body.value_cents && previous.due_date === body.due_date && previous.paid_at === body.paid_at && previous.invoice_url === body.invoice_url) return;
    await db("payments", { method: "POST", query: { on_conflict: "asaas_payment_id" }, prefer: "resolution=ignore-duplicates,return=minimal", body: { ...body, member_id: memberId, subscription_id: localSubscription.id, asaas_payment_id: payment.id } });
    await assertBillingOwnership(memberId, { id: payment.id }, hints.signal);
    await db("payments", { method: "PATCH", query: { asaas_payment_id: `eq.${payment.id}`, member_id: `eq.${memberId}` }, body });
  }));
  const recurring = Boolean(providerSubscription?.id || localSubscription.asaas_subscription_id || latest?.subscription);
  const decision = billingDecision({ payments: snapshots, memberStatus: member.participation_status, subscriptionStatus: localSubscription.status, recurring, providerStatus: providerSubscription?.status || (providerSubscriptionMissing ? "DELETED" : undefined), today: saoPauloDate() });
  const now = new Date().toISOString();
  await Promise.all([
    db("subscriptions", {
      method: "PATCH", query: { id: `eq.${localSubscription.id}`, status: `eq.${localSubscription.status}`, asaas_customer_id: customerId ? `eq.${customerId}` : "is.null" },
      body: {
        asaas_subscription_id: providerSubscription?.id || localSubscription.asaas_subscription_id,
        asaas_customer_id: customerId,
        status: decision.subscriptionStatus,
        amount_cents: providerSubscription?.value ? Math.round(providerSubscription.value * 100) : latest?.value ? Math.round(latest.value * 100) : localSubscription.amount_cents,
        next_due_date: providerSubscription?.nextDueDate || decision.paidThrough || localSubscription.next_due_date,
        current_period_end: decision.paidThrough,
        overdue_since: decision.overdueSince, updated_at: now,
      },
    }),
    decision.memberStatus !== member.participation_status
      ? db("members", { method: "PATCH", query: { id: `eq.${memberId}`, participation_status: `eq.${member.participation_status}` }, body: { participation_status: decision.memberStatus, joined_at: decision.covered ? member.joined_at || now : member.joined_at, updated_at: now } })
      : Promise.resolve(),
  ]);
  if (decision.notice) await sendBillingTransitionEmails({ ...decision.notice, member }, hints.signal);
  return { found: Boolean(providerSubscription || snapshots.length), paymentCount: snapshots.length, active: decision.memberStatus === "active" };
}
