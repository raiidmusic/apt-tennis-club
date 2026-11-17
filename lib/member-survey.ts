import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getSession, requireAdmin } from "./auth";
import { runtimeEnv, supabaseAdmin, supabaseAll, SupabaseRequestError } from "./supabase-server";

export type SurveyField = {
  id: string; key: string; title: string;
  kind: "multiple_choice" | "opinion_scale" | "long_text";
  required?: boolean; min?: number; max?: number; allowOther?: boolean;
  choices?: Array<{ id: string; label: string }>; exclusiveChoiceIds?: string[];
};
export type MemberSurvey = {
  id: string; slug: string; title: string; heyform_id: string; active: boolean;
  opens_at: string; closes_at: string; fields: SurveyField[]; eligible_member_ids: string[];
};
type SurveyContext = { v: 1; memberId: string; surveyId: string; formId: string; issuedAt: number; expiresAt: number };
type SurveyAnswers = Record<string, number | string | string[]>;
type StoredResponse = { id: string; survey_id: string; member_id: string; heyform_submission_id: string; answers: SurveyAnswers; content_hash: string; received_at: string; members?: { name: string; class_level: string | null } };
const grace = 72 * 3600_000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const providerId = /^[A-Za-z0-9_-]{6,128}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

function secret(name: string) {
  const value = runtimeEnv()[name];
  if (!value || value.length < 32) throw new SupabaseRequestError("Pesquisa ainda não configurada.", 503);
  return value;
}
function equal(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function invalid(message = "Resposta de pesquisa inválida."): never { throw new SupabaseRequestError(message, 400); }
function failure(error: unknown) {
  const status = error instanceof SupabaseRequestError ? error.status : 500;
  return Response.json({ error: status === 503 ? "Pesquisa temporariamente indisponível. A entrega pode ser repetida." : "Não foi possível concluir a solicitação da pesquisa." }, { status: status >= 400 && status < 600 ? status : 500 });
}

export function issueSurveyContext(input: Omit<SurveyContext, "v">, key: string) {
  if (key.length < 32) throw new Error("Survey signing key is too short");
  const body = Buffer.from(JSON.stringify({ v: 1, ...input })).toString("base64url");
  return `${body}.${createHmac("sha256", key).update(body).digest("base64url")}`;
}
export function verifySurveyContext(token: string, key: string, now = Date.now()): SurveyContext {
  if (key.length < 32 || typeof token !== "string" || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) throw new SupabaseRequestError("Contexto inválido.", 401);
  const [body, signature] = token.split(".");
  if (!equal(signature, createHmac("sha256", key).update(body).digest("base64url"))) throw new SupabaseRequestError("Contexto inválido.", 401);
  let value: unknown;
  try { value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new SupabaseRequestError("Contexto inválido.", 401); }
  if (!object(value) || value.v !== 1 || typeof value.memberId !== "string" || !uuid.test(value.memberId) || typeof value.surveyId !== "string" || !uuid.test(value.surveyId) || typeof value.formId !== "string" || !providerId.test(value.formId) ||
    !Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt) || Number(value.issuedAt) > now || Number(value.expiresAt) <= now || Number(value.expiresAt) <= Number(value.issuedAt)) throw new SupabaseRequestError("Contexto inválido.", 401);
  return value as SurveyContext;
}

export function normalizeSurveyAnswers(input: unknown, fields: SurveyField[]): SurveyAnswers {
  if (!Array.isArray(input) || input.length > 30 || !Array.isArray(fields) || fields.length < 1 || fields.length > 30) invalid();
  const byId = new Map<string, Record<string, unknown>>();
  for (const answer of input) {
    if (!object(answer) || typeof answer.id !== "string" || byId.has(answer.id) || !fields.some(field => field.id === answer.id)) invalid();
    byId.set(answer.id, answer);
  }
  const result: SurveyAnswers = {};
  for (const field of fields) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(field.key) || Object.hasOwn(result, field.key)) invalid();
    const answer = byId.get(field.id);
    if (!answer || answer.value === null || answer.value === undefined || answer.value === "") {
      if (field.required) invalid();
      continue;
    }
    if (answer.kind !== field.kind) invalid();
    if (field.kind === "opinion_scale") {
      if (typeof answer.value !== "number" || !Number.isInteger(answer.value) || answer.value < (field.min ?? 1) || answer.value > (field.max ?? 5)) invalid();
      result[field.key] = answer.value;
    } else if (field.kind === "long_text") {
      if (typeof answer.value !== "string" || answer.value.length > 1200 || /\u0000/.test(answer.value)) invalid();
      const value = answer.value.trim();
      if (field.required && !value) invalid();
      if (value) result[field.key] = value;
    } else if (field.kind === "multiple_choice") {
      const value = answer.value;
      if (!object(value) || !Array.isArray(value.value) || value.value.some(choice => typeof choice !== "string") || new Set(value.value).size !== value.value.length ||
        (value.other !== undefined && (typeof value.other !== "string" || value.other.length > 300 || !field.allowOther))) invalid();
      const other = typeof value.other === "string" ? value.other.trim() : "";
      const count = value.value.length + Number(Boolean(other));
      if (count > (field.max ?? 1) || (field.required && count < 1) || (count > 1 && value.value.some(choice => field.exclusiveChoiceIds?.includes(choice)))) invalid();
      const labels = value.value.map(choice => {
        const item = field.choices?.find(option => option.id === choice);
        if (!item) invalid();
        return item.label;
      });
      if (other) labels.push(`Outro: ${other}`);
      result[field.key] = labels;
    } else invalid();
  }
  return result;
}

async function boundedJson(request: Request) {
  if (Number(request.headers.get("content-length")) > 65_536) throw new SupabaseRequestError("Resposta muito grande.", 413);
  const reader = request.body?.getReader();
  if (!reader) invalid();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 65_536) { await reader.cancel(); throw new SupabaseRequestError("Resposta muito grande.", 413); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; } catch { invalid(); }
}
function surveyIsConfigured(survey: MemberSurvey | undefined): survey is MemberSurvey {
  return Boolean(survey && uuid.test(survey.id) && providerId.test(survey.heyform_id) && Array.isArray(survey.eligible_member_ids) && Array.isArray(survey.fields) && Number.isFinite(Date.parse(survey.opens_at)) && Date.parse(survey.closes_at) > Date.parse(survey.opens_at));
}

export async function receiveHeyFormEvent(request: Request, now = Date.now()) {
  try {
    const expected = `Basic ${Buffer.from(`apt-heyform:${secret("APT_HEYFORM_WEBHOOK_SECRET")}`).toString("base64")}`;
    if (!equal(request.headers.get("authorization") || "", expected)) return Response.json({ error: "Entrega não autorizada." }, { status: 401 });
    const payload = await boundedJson(request);
    if (!object(payload) || typeof payload.id !== "string" || !providerId.test(payload.id) || typeof payload.formId !== "string" || !providerId.test(payload.formId) || !Array.isArray(payload.hiddenFields) || payload.hiddenFields.length > 10) invalid();
    const contexts = payload.hiddenFields.filter(row => object(row) && row.name === "apt_context");
    if (contexts.length !== 1 || typeof contexts[0].value !== "string") throw new SupabaseRequestError("Contexto ausente.", 401);
    const context = verifySurveyContext(contexts[0].value, secret("APT_SURVEY_CONTEXT_SECRET"), now);
    const survey = (await supabaseAdmin<MemberSurvey[]>("member_surveys", { query: { select: "*", id: `eq.${context.surveyId}`, limit: "1" } }))[0];
    if (!surveyIsConfigured(survey) || survey.heyform_id !== payload.formId || context.formId !== payload.formId || !survey.eligible_member_ids.includes(context.memberId) ||
      context.issuedAt < Date.parse(survey.opens_at) || context.issuedAt >= Date.parse(survey.closes_at) || context.expiresAt !== Date.parse(survey.closes_at) + grace) throw new SupabaseRequestError("Contexto não pertence à pesquisa.", 401);
    const answers = normalizeSurveyAnswers(payload.answers, survey.fields);
    const contentHash = createHash("sha256").update(JSON.stringify(answers)).digest("hex");
    try {
      await supabaseAdmin("member_survey_responses", { method: "POST", body: { survey_id: survey.id, member_id: context.memberId, heyform_submission_id: payload.id, answers, content_hash: contentHash } });
      return Response.json({ received: true }, { status: 201 });
    } catch (error) {
      if (!(error instanceof SupabaseRequestError) || error.status !== 409) throw error;
      const existing = (await supabaseAdmin<StoredResponse[]>("member_survey_responses", { query: { select: "heyform_submission_id,content_hash", survey_id: `eq.${survey.id}`, member_id: `eq.${context.memberId}`, limit: "1" } }))[0];
      if (existing?.heyform_submission_id === payload.id && existing.content_hash === contentHash) return Response.json({ received: true, duplicate: true });
      return Response.json({ error: "O membro já tem uma resposta registrada. A resposta anterior foi preservada." }, { status: 409 });
    }
  } catch (error) { return failure(error); }
}

export async function memberSurveyAccess(request: Request, now = Date.now()) {
  const session = await getSession(request).catch(() => null);
  if (!session) return Response.json({ error: "Entre na sua conta APT para responder." }, { status: 401 });
  try {
    const slug = new URL(request.url).searchParams.get("survey") || "experiencia-2026";
    if (!slugPattern.test(slug) || slug.length > 80) invalid();
    const memberId = session.memberId || (await supabaseAdmin<Array<{ id: string }>>("members", { query: { select: "id", auth_user_id: `eq.${session.id}`, limit: "1" } }))[0]?.id;
    const survey = (await supabaseAdmin<MemberSurvey[]>("member_surveys", { query: { select: "*", slug: `eq.${slug}`, limit: "1" } }))[0];
    if (!surveyIsConfigured(survey)) return Response.json({ error: "Pesquisa indisponível." }, { status: 404 });
    if (!memberId || !survey.eligible_member_ids.includes(memberId)) return Response.json({ error: "Esta pesquisa é destinada aos membros convidados." }, { status: 403 });
    const [members, responses] = await Promise.all([
      supabaseAdmin<Array<{ name: string }>>("members", { query: { select: "name", id: `eq.${memberId}`, limit: "1" } }),
      supabaseAdmin<Array<{ received_at: string }>>("member_survey_responses", { query: { select: "received_at", member_id: `eq.${memberId}`, survey_id: `eq.${survey.id}`, limit: "1" } }),
    ]);
    const submittedAt = responses[0]?.received_at || null;
    const available = survey.active && now >= Date.parse(survey.opens_at) && now < Date.parse(survey.closes_at);
    const result = { title: survey.title, memberName: members[0]?.name || "Membro APT", submittedAt, state: submittedAt ? "submitted" : available ? "open" : "closed" };
    if (!available || submittedAt) return Response.json(result);
    const base = new URL(runtimeEnv().APT_HEYFORM_URL || "");
    if (base.protocol !== "https:" && !(runtimeEnv().NODE_ENV !== "production" && base.hostname === "127.0.0.1")) throw new SupabaseRequestError("Origem da pesquisa inválida.", 503);
    if (base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new SupabaseRequestError("Origem da pesquisa inválida.", 503);
    const formUrl = new URL(`/form/${encodeURIComponent(survey.heyform_id)}`, base);
    formUrl.searchParams.set("apt_context", issueSurveyContext({ memberId, surveyId: survey.id, formId: survey.heyform_id, issuedAt: now, expiresAt: Date.parse(survey.closes_at) + grace }, secret("APT_SURVEY_CONTEXT_SECRET")));
    return Response.json({ ...result, formUrl: formUrl.toString() });
  } catch (error) { return failure(error); }
}

export function surveyCsvCell(value: unknown) {
  let text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function adminSurveyResults(request: Request) {
  if (!await requireAdmin(request).catch(() => null)) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const surveyId = new URL(request.url).searchParams.get("id");
    const surveys = await supabaseAdmin<MemberSurvey[]>("member_surveys", { query: { select: "*", ...(surveyId ? { id: `eq.${uuid.test(surveyId) ? surveyId : invalid()}` } : {}), order: "opens_at.desc", limit: "50" } });
    const results = await Promise.all(surveys.map(async survey => ({ survey, responses: await supabaseAll<StoredResponse>("member_survey_responses", { query: { select: "id,survey_id,member_id,heyform_submission_id,answers,received_at,members(name,class_level)", survey_id: `eq.${survey.id}`, order: "received_at.desc,id.desc" } }) })));
    if (new URL(request.url).searchParams.get("format") === "csv") {
      if (results.length !== 1) invalid();
      const { survey, responses } = results[0];
      const rows = [["Membro", "Classe", "Recebida em", ...survey.fields.map(field => field.title)], ...responses.map(row => [row.members?.name, row.members?.class_level, row.received_at, ...survey.fields.map(field => row.answers[field.key])])];
      return new Response(`\ufeff${rows.map(row => row.map(surveyCsvCell).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pesquisa-apt.csv"' } });
    }
    return Response.json({ results });
  } catch (error) { return failure(error); }
}
