import assert from "node:assert/strict";
import test from "node:test";
import { asaasPaymentState } from "../lib/billing-state.ts";

test("classifies the Asaas payment states that change member access", () => {
  assert.deepEqual(asaasPaymentState("confirmed"), { normalized: "CONFIRMED", paid: true, failed: false });
  assert.deepEqual(asaasPaymentState("OVERDUE"), { normalized: "OVERDUE", paid: false, failed: true });
  assert.deepEqual(asaasPaymentState("PENDING"), { normalized: "PENDING", paid: false, failed: false });
});
