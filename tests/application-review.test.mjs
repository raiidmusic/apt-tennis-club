import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("application review exposes answers and records internal notes without false delivery", async () => {
  const [route, app] = await Promise.all([
    readFile(new URL("../app/api/requerimentos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(route, /admin_notes/);
  assert.match(route, /payload\.status === "awaiting_info" && !note/);
  assert.match(route, /Não foi possível carregar os requerimentos/);
  assert.doesNotMatch(route, /return Response\.json\(\{ applications: \[\] \}\)/);
  assert.match(app, /ApplicationReviewDetail/);
  assert.match(app, /Mova o lead com uma decisão clara/);
  assert.match(app, /Aprovar e gerar convite/);
  assert.match(app, /Copiar link individual de cadastro/);
});
