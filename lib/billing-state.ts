const paidStates = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const failedStates = new Set(["OVERDUE", "REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "CREDIT_CARD_CAPTURE_REFUSED", "DELETED", "REPROVED_BY_RISK_ANALYSIS"]);
const protectedStates = new Set(["courtesy", "inactive", "cancelled", "cancellation_requested"]);

export function isProtectedMembership(status: string) {
  return protectedStates.has(status);
}

export function saoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export type BillingPayment = {
  id?: string; status?: string; dueDate?: string; paymentDate?: string; clientPaymentDate?: string; dateCreated?: string; subscription?: string;
};

// Coverage comes from a receipt, never the provider's scheduled next invoice.
export function billingDecision(input: {
  payments: BillingPayment[];
  memberStatus: string;
  subscriptionStatus: string;
  recurring: boolean;
  providerStatus?: string;
  today: string;
}) {
  const sorted = [...input.payments].sort((a, b) => (b.dueDate || b.dateCreated || "").localeCompare(a.dueDate || a.dateCreated || ""));
  const receipts = sorted.filter((payment) => asaasPaymentState(payment.status).paid).map((payment) => {
    const start = (input.recurring ? payment.dueDate : payment.paymentDate || payment.clientPaymentDate || payment.dueDate)?.slice(0, 10);
    return { payment, start, end: monthlyAccessEnd(start) };
  }).filter((receipt) => receipt.start && receipt.start <= input.today && receipt.end)
    .sort((a, b) => b.end!.localeCompare(a.end!));
  const receipt = receipts[0];
  const covered = Boolean(receipt?.end && !isDateBefore(receipt.end, input.today));
  const closedProvider = ["CANCELLED", "CANCELED", "INACTIVE", "DELETED"].includes((input.providerStatus || "").toUpperCase());
  const protectedState = isProtectedMembership(input.memberStatus) || ["courtesy", "cancelled", "cancel_at_period_end"].includes(input.subscriptionStatus);
  const failure = sorted.find((payment) => asaasPaymentState(payment.status).failed && (!payment.dueDate || payment.dueDate <= input.today));
  const expired = Boolean(receipt?.end && isDateBefore(receipt.end, input.today));
  const attention = !protectedState && !closedProvider && !covered && Boolean(failure || expired);
  const memberStatus = protectedState ? input.memberStatus : closedProvider ? covered ? "cancellation_requested" : "cancelled" : covered ? "active" : attention ? "pending_payment" : "awaiting_payment";
  const subscriptionStatus = protectedState ? input.subscriptionStatus : closedProvider ? "cancelled" : covered ? "active" : attention ? "past_due" : input.subscriptionStatus === "pending_configuration" ? "pending_configuration" : "awaiting_payment";
  return {
    memberStatus, subscriptionStatus, covered, paidThrough: receipt?.end || null,
    overdueSince: attention ? failure?.dueDate || receipt?.end || input.today : null,
    notice: protectedState || closedProvider ? null : covered && receipt?.payment.id
      ? { kind: "confirmed" as const, paymentId: receipt.payment.id, providerStatus: asaasPaymentState(receipt.payment.status).normalized }
      : attention && (failure?.id || receipt?.payment.id)
        ? { kind: "attention" as const, paymentId: failure?.id || receipt!.payment.id!, providerStatus: failure ? asaasPaymentState(failure.status).normalized : input.recurring ? "MONTHLY_DUE" : "PIX_MONTHLY_DUE" }
        : null,
  };
}

export function asaasPaymentState(status = "") {
  const normalized = status.toUpperCase();
  return { normalized, paid: paidStates.has(normalized), failed: failedStates.has(normalized) };
}

export function monthlyAccessEnd(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function isDateBefore(value?: string | null, reference?: string | null) {
  return Boolean(value && reference && /^\d{4}-\d{2}-\d{2}$/.test(value) && /^\d{4}-\d{2}-\d{2}$/.test(reference) && value < reference);
}
