import { billingDecision, isProtectedMembership } from "./billing-state";

export type BillingPaymentRow = {
  id: string; member_id: string; asaas_payment_id?: string; status: string; value_cents: number;
  due_date?: string | null; paid_at?: string | null; invoice_url?: string | null; created_at: string; payload?: unknown;
};
export type BillingSubscriptionRow = {
  member_id?: string; status: string; amount_cents: number; asaas_customer_id?: string | null;
  asaas_subscription_id?: string | null; asaas_checkout_id?: string | null; asaas_checkout_url?: string | null;
  asaas_checkout_expires_at?: string | null; current_period_end?: string | null; next_due_date?: string | null;
  cancel_at_period_end?: boolean;
};
export type FinancialPayment = {
  id: string; memberId: string; providerId: string | null; status: string; valueCents: number;
  dueDate: string | null; receivedAt: string | null; confirmedAt: string | null; billingType: string | null;
  invoiceUrl: string | null;
};

// Provider dates are calendar days. Parsing them as UTC instants moves the first day into the previous month in Brazil.
export function billingCalendarDate(value: unknown) {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day ? day : null;
}

export function billingMonthKeys(today: string) {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(year, month - 6 + index, 1, 12)).toISOString().slice(0, 7));
}

function paymentPayload(row: BillingPaymentRow): Record<string, unknown> {
  return row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {};
}

export function financialPayment(row: BillingPaymentRow): FinancialPayment {
  const payload = paymentPayload(row);
  const status = row.status.toUpperCase();
  return {
    id: row.id, memberId: row.member_id, providerId: row.asaas_payment_id || null, status, valueCents: row.value_cents,
    dueDate: billingCalendarDate(row.due_date),
    receivedAt: ["RECEIVED", "RECEIVED_IN_CASH"].includes(status) ? billingCalendarDate(payload.paymentDate) || billingCalendarDate(payload.clientPaymentDate) || billingCalendarDate(row.paid_at) : null,
    confirmedAt: status === "CONFIRMED" ? billingCalendarDate(payload.confirmedDate) || billingCalendarDate(payload.paymentDate) || billingCalendarDate(payload.clientPaymentDate) || billingCalendarDate(row.paid_at) : null,
    billingType: typeof payload.billingType === "string" ? payload.billingType : null,
    invoiceUrl: row.invoice_url || null,
  };
}

export function memberFinancialView(memberStatus: string, subscription: BillingSubscriptionRow | null | undefined, rows: BillingPaymentRow[], today: string) {
  const sorted = [...rows].sort((a, b) => (b.due_date || b.created_at).localeCompare(a.due_date || a.created_at));
  const currentPayments = subscription?.asaas_subscription_id ? sorted.filter((row) => paymentPayload(row).subscription === subscription.asaas_subscription_id) : [];
  const recurring = Boolean(subscription?.asaas_subscription_id && currentPayments.some((row) => paymentPayload(row).billingType === "CREDIT_CARD"));
  const latestMethod = sorted.map((row) => paymentPayload(row).billingType).find((method) => method === "PIX" || method === "CREDIT_CARD");
  const billingMethod = recurring ? "card" as const : latestMethod === "PIX" ? "pix" as const : null;
  const payments = sorted.map(financialPayment);
  const decision = billingDecision({
    payments: sorted.map((row) => {
      const payload = paymentPayload(row);
      return { id: row.asaas_payment_id || row.id, status: row.status, dueDate: billingCalendarDate(row.due_date) || undefined, paymentDate: billingCalendarDate(payload.paymentDate) || billingCalendarDate(row.paid_at) || undefined, clientPaymentDate: billingCalendarDate(payload.clientPaymentDate) || undefined };
    }), memberStatus, subscriptionStatus: subscription?.status || "pending_configuration", recurring: Boolean(subscription?.asaas_subscription_id), today,
    providerStatus: subscription?.status === "cancelled" ? "CANCELLED" : undefined,
  });
  const protectedState = isProtectedMembership(memberStatus) || subscription?.status === "courtesy";
  const overdue = payments.filter((payment) => payment.status === "OVERDUE" && payment.dueDate && payment.dueDate <= today);
  const pixRenewalDue = !protectedState && billingMethod === "pix" && !recurring && Boolean(decision.paidThrough && decision.paidThrough < today) && overdue.length === 0;
  const checkoutAvailable = Boolean(subscription?.status === "awaiting_payment" && subscription.asaas_checkout_id && subscription.asaas_checkout_url && subscription.asaas_checkout_expires_at && Date.parse(subscription.asaas_checkout_expires_at) > Date.now());
  const configurationRequired = !protectedState && (!subscription || (!subscription.asaas_customer_id && !recurring) || (!payments.length && !checkoutAvailable));
  const divergence = !protectedState && (memberStatus !== decision.memberStatus || (!billingMethod && payments.length > 0));
  return {
    billingMethod, recurring, covered: decision.covered, paidThrough: decision.paidThrough, storedParticipationStatus: memberStatus,
    participationStatus: decision.memberStatus, subscriptionStatus: decision.subscriptionStatus,
    lastReceivedAt: payments.map((payment) => payment.receivedAt).filter((day): day is string => Boolean(day)).sort().at(-1) || null,
    nextInvoiceDueDate: payments.filter((payment) => payment.status === "PENDING" && payment.dueDate && payment.dueDate >= today).map((payment) => payment.dueDate!).sort()[0] || null,
    overdueCents: overdue.reduce((total, payment) => total + payment.valueCents, 0), overdueInvoiceIds: overdue.map((payment) => payment.id),
    pixRenewalDue, configurationRequired, divergence,
    recurringActive: recurring && decision.covered && !protectedState && subscription?.status === "active" && !subscription.cancel_at_period_end,
    checkoutAvailable,
    reason: protectedState ? "manual" : overdue.length ? "overdue" : pixRenewalDue ? "pix_renewal" : configurationRequired ? "configuration" : !decision.covered ? "uncovered" : divergence ? "divergence" : "covered",
  };
}

export type MemberFinancialView = ReturnType<typeof memberFinancialView>;
export type FinancialMetric = "recurring" | "received" | "confirmed" | "overdue" | "pix_renewal" | "configuration";

export function financialMetricRows(metric: FinancialMetric, members: Array<{ id: string; amountCents: number; financial: MemberFinancialView }>, payments: FinancialPayment[], month: string) {
  const invoices = payments.filter((payment) => metric === "received" ? Boolean(payment.receivedAt?.startsWith(month)) : metric === "confirmed" ? Boolean(payment.confirmedAt?.startsWith(month)) : metric === "overdue" ? members.some((member) => member.id === payment.memberId && member.financial.overdueInvoiceIds.includes(payment.id)) : false);
  const athletes = metric === "recurring" ? members.filter((member) => member.financial.recurringActive) : metric === "pix_renewal" ? members.filter((member) => member.financial.pixRenewalDue) : metric === "configuration" ? members.filter((member) => member.financial.configurationRequired) : [];
  return { invoices, athletes, valueCents: invoices.reduce((sum, payment) => sum + payment.valueCents, 0) + athletes.reduce((sum, member) => sum + (metric === "configuration" ? 0 : member.amountCents), 0) };
}
