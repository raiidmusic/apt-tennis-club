import { ensureCheckoutPaymentReminders, retryBillingEmailDeliveries } from "./apt-email";
import { processPendingAsaasEvents, MAX_WEBHOOK_ATTEMPTS } from "./asaas-events";
import { reconcileMemberBilling } from "./billing-reconciliation";
import { supabaseAdmin } from "./supabase-server";

type Candidate = { id: string; billing_last_attempt_at: string | null };
type Subscription = { member_id: string; status: string; asaas_customer_id: string | null; asaas_subscription_id: string | null; asaas_checkout_id: string | null };

export async function recoverMemberBilling(signal: AbortSignal, limit = 40) {
  const candidates = await supabaseAdmin<Candidate[]>("members", {
    query: { select: "id,billing_last_attempt_at", participation_status: "in.(pending_payment,awaiting_payment,active,delinquent)", order: "billing_last_attempt_at.asc.nullsfirst,id.asc", limit: String(limit) }, signal,
  });
  const subscriptions = candidates.length ? await supabaseAdmin<Subscription[]>("subscriptions", {
    query: { select: "member_id,status,asaas_customer_id,asaas_subscription_id,asaas_checkout_id", member_id: `in.(${candidates.map((member) => member.id).join(",")})`, limit: String(limit) }, signal,
  }) : [];
  const subscriptionByMember = new Map(subscriptions.map((subscription) => [subscription.member_id, subscription]));
  let checked = 0, reconciled = 0, failed = 0, exceptions = 0;
  for (let index = 0; index < candidates.length && !signal.aborted; index += 4) {
    await Promise.all(candidates.slice(index, index + 4).map(async (member) => {
      const subscription = subscriptionByMember.get(member.id);
      const attempt = new Date().toISOString();
      let issue: string | null = !subscription ? "missing_subscription"
        : !subscription.asaas_customer_id && !subscription.asaas_subscription_id && !subscription.asaas_checkout_id ? "missing_provider" : null;
      try {
        // Stamp every attempt before provider work, including failures and missing configuration, to rotate fairly.
        await supabaseAdmin("members", { method: "PATCH", query: { id: `eq.${member.id}` }, body: { billing_last_attempt_at: attempt, billing_reconciliation_issue: issue }, signal });
        checked++;
        if (issue) { exceptions++; return; }
        const result = await reconcileMemberBilling(member.id, { signal });
        await ensureCheckoutPaymentReminders(member.id, signal);
        issue = result.found ? null : "provider_unresolved";
        await supabaseAdmin("members", { method: "PATCH", query: { id: `eq.${member.id}` }, body: { ...(result.found ? { billing_last_success_at: new Date().toISOString() } : {}), billing_reconciliation_issue: issue }, signal });
        if (result.found) reconciled++;
        if (issue) exceptions++;
      } catch {
        failed++;
        // A fresh bounded signal records only failure evidence after the financial work has been aborted.
        await supabaseAdmin("members", { method: "PATCH", query: { id: `eq.${member.id}` }, body: { billing_last_attempt_at: attempt, billing_reconciliation_issue: "reconciliation_failed" }, signal: AbortSignal.timeout(2_000) }).catch(() => undefined);
      }
    }));
  }
  return { checked, reconciled, failed, exceptions, deferred: candidates.length - checked };
}

export async function runBillingRecovery() {
  const startedAt = new Date().toISOString();
  // One shared deadline actually aborts all fetches; no Promise.race leaves financial writes running.
  const workSignal = AbortSignal.timeout(40_000);
  const [memberRun, webhookRun] = await Promise.allSettled([
    recoverMemberBilling(workSignal), processPendingAsaasEvents(workSignal),
  ]);
  const workTimedOut = workSignal.aborted;
  const members = memberRun.status === "fulfilled" ? memberRun.value : { checked: 0, reconciled: 0, failed: 1, exceptions: 0, deferred: 0 };
  const webhooks = webhookRun.status === "fulfilled" ? webhookRun.value : { checked: 0, processed: 0, failed: 1 };
  let emailResults: string[] = [];
  let emailFailed = false;
  try { emailResults = await retryBillingEmailDeliveries(40, [], AbortSignal.timeout(10_000)); } catch { emailFailed = true; }
  const run = {
    ok: members.failed === 0 && webhooks.failed === 0 && !emailFailed,
    startedAt, finishedAt: new Date().toISOString(), timedOut: workTimedOut,
    ...members, webhooks,
    emailsSent: emailResults.filter((status) => status === "sent").length,
    emailsSuppressed: emailResults.filter((status) => status === "suppressed").length,
    emailsPending: emailResults.filter((status) => status !== "sent" && status !== "suppressed").length,
    emailFailed,
  };
  await supabaseAdmin("audit_logs", { method: "POST", body: { actor: "system", action: "billing.reconciliation_run", entity_type: "billing", metadata: run }, signal: AbortSignal.timeout(2_000) });
  return run;
}

export async function billingOperationsSummary() {
  const count = (table: string, query: Record<string, string>) => supabaseAdmin<number>(table, { method: "HEAD", count: true, query: { select: "id", ...query }, signal: AbortSignal.timeout(8_000) });
  const [runs, webhookPending, webhookFailed, webhookExhausted, emailPending, emailFailed, emailReviewRequired, exceptionCount, exceptions] = await Promise.all([
    supabaseAdmin<Array<{ created_at: string; metadata: Record<string, unknown> }>>("audit_logs", { query: { select: "created_at,metadata", action: "eq.billing.reconciliation_run", order: "created_at.desc", limit: "1" } }),
    count("webhook_events", { processed_at: "is.null" }),
    count("webhook_events", { processed_at: "is.null", processing_error: "not.is.null" }),
    count("webhook_events", { processed_at: "is.null", attempt_count: `gte.${MAX_WEBHOOK_ATTEMPTS}` }),
    count("billing_email_deliveries", { status: "eq.pending" }),
    count("billing_email_deliveries", { status: "eq.failed" }),
    count("billing_email_deliveries", { status: "in.(pending,failed)", send_claimed_at: "not.is.null" }),
    count("members", { billing_reconciliation_issue: "not.is.null" }),
    supabaseAdmin<Array<{ id: string; billing_last_attempt_at: string | null; billing_last_success_at: string | null; billing_reconciliation_issue: string }>>("members", { query: { select: "id,billing_last_attempt_at,billing_last_success_at,billing_reconciliation_issue", billing_reconciliation_issue: "not.is.null", order: "billing_last_attempt_at.desc", limit: "100" } }),
  ]);
  const run = runs[0];
  const metadata = run?.metadata || {};
  const eventMetrics = metadata.webhooks as Record<string, unknown> | undefined;
  // Only the declared aggregate fields leave the audit table; payloads/errors/headers are never exposed.
  const latestRun = run ? {
    recordedAt: run.created_at, startedAt: metadata.startedAt, finishedAt: metadata.finishedAt,
    ok: metadata.ok, timedOut: metadata.timedOut, checked: metadata.checked, reconciled: metadata.reconciled,
    failed: metadata.failed, exceptions: metadata.exceptions, deferred: metadata.deferred,
    emailsSent: metadata.emailsSent, emailsSuppressed: metadata.emailsSuppressed, emailsPending: metadata.emailsPending, emailFailed: metadata.emailFailed,
    webhooks: { checked: eventMetrics?.checked, processed: eventMetrics?.processed, failed: eventMetrics?.failed },
  } : null;
  return { latestRun, webhooks: { pending: webhookPending, failed: webhookFailed, exhausted: webhookExhausted }, emails: { pending: emailPending, failed: emailFailed, reviewRequired: emailReviewRequired }, exceptionCount, exceptionsTruncated: exceptionCount > exceptions.length, exceptions: exceptions.map((member) => ({ memberId: member.id, lastAttemptAt: member.billing_last_attempt_at, lastSuccessAt: member.billing_last_success_at, issue: member.billing_reconciliation_issue })) };
}
