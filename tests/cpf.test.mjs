import assert from "node:assert/strict";
import test from "node:test";
import { isValidCpf } from "../lib/cpf.ts";

test("accepts valid CPF digits and rejects invalid sequences", () => {
  assert.equal(isValidCpf("52998224725"), true);
  assert.equal(isValidCpf("11111111111"), false);
  assert.equal(isValidCpf("52998224724"), false);
});
