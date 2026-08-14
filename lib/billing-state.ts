const paidStates = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const failedStates = new Set(["OVERDUE", "REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "CREDIT_CARD_CAPTURE_REFUSED"]);

export function asaasPaymentState(status = "") {
  const normalized = status.toUpperCase();
  return { normalized, paid: paidStates.has(normalized), failed: failedStates.has(normalized) };
}
