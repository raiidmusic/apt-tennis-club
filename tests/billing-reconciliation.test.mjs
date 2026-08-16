import assert from "node:assert/strict";
import test from "node:test";
import { asaasPaymentState, monthlyAccessEnd } from "../lib/billing-state.ts";

test("classifies the Asaas payment states that change member access", () => {
  assert.deepEqual(asaasPaymentState("confirmed"), { normalized: "CONFIRMED", paid: true, failed: false });
  assert.deepEqual(asaasPaymentState("OVERDUE"), { normalized: "OVERDUE", paid: false, failed: true });
  assert.deepEqual(asaasPaymentState("PENDING"), { normalized: "PENDING", paid: false, failed: false });
});

test("grants one calendar month for an explicitly linked one-off payment", () => {
  assert.equal(monthlyAccessEnd("2026-08-16"), "2026-09-16");
  assert.equal(monthlyAccessEnd("2026-01-31T12:00:00Z"), "2026-02-28");
  assert.equal(monthlyAccessEnd("invalid"), null);
});
