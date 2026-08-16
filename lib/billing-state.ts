const paidStates = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const failedStates = new Set(["OVERDUE", "REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "CREDIT_CARD_CAPTURE_REFUSED"]);

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
