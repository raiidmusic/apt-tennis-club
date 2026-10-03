import { runtimeEnv, supabaseAdmin } from "./supabase-server";
import { asaasPaymentHistory, asaasRequest, type AsaasPaymentSnapshot } from "./asaas";
import { billingDecision, isProtectedMembership, saoPauloDate } from "./billing-state";

export type EmailDeliveryStatus = "sent" | "failed" | "not_configured";

type EmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  flow: string;
  idempotencyKey: string;
  signal?: AbortSignal;
};

type BillingEmailDelivery = {
  id: string;
  dedupe_key: string;
  member_id: string;
  payment_id: string | null;
  checkout_id: string | null;
  kind: "confirmed" | "attention" | "checkout_reminder";
  recipient_email: string;
  reply_to: string | null;
  subject: string;
  body_text: string;
  flow: string;
  status: "pending" | "failed" | "sent" | "suppressed";
  attempt_count: number;
  provider_status: string;
  send_claimed_at: string | null;
};

type CheckoutReminderContext = {
  member: { id: string; name: string; email: string; participation_status: string };
  subscription: {
    status: string;
    asaas_checkout_id: string | null;
    asaas_checkout_url: string | null;
    asaas_checkout_expires_at: string | null;
  };
};

const emailPattern = /^\S+@\S+\.\S+$/;
const urlPattern = /(https?:\/\/[^\s<]+)/g;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

function linkedText(value: string) {
  return value.split(urlPattern).map((part) => {
    if (!/^https?:\/\//.test(part)) return escapeHtml(part);
    const url = escapeHtml(part);
    return `<a class="apt-email-link" href="${url}" style="color:#c94a1d;text-decoration:underline;text-underline-offset:3px;">${url}</a>`;
  }).join("");
}

function emailHtml(subject: string, text: string, publicUrl?: string) {
  const logo = publicUrl
    ? `<img src="${escapeHtml(`${publicUrl.replace(/\/$/, "")}/logo-apt1.svg`)}" width="92" alt="APT Tennis Club" style="display:block;width:92px;height:auto;border:0;" />`
    : `<strong style="font-family:Arial,sans-serif;font-size:24px;letter-spacing:-1px;">apt.</strong>`;
  const body = text.trim().split(/\n{2,}/).filter(Boolean)
    .map((paragraph) => `<p class="apt-email-copy" style="margin:0 0 18px;color:#25344a;font-family:Arial,sans-serif;font-size:16px;line-height:1.65;">${linkedText(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" /><style>@media (prefers-color-scheme:dark){.apt-email-shell{background:#071426!important}.apt-email-panel{background:#10203a!important;border-color:#38506f!important}.apt-email-title{color:#f8f2ef!important}.apt-email-copy{color:#e6edf7!important}.apt-email-link{color:#ff9b78!important}.apt-email-footer{border-color:#38506f!important;color:#c4d0e0!important}}[data-ogsc] .apt-email-shell{background:#071426!important}[data-ogsc] .apt-email-panel{background:#10203a!important;border-color:#38506f!important}[data-ogsc] .apt-email-title{color:#f8f2ef!important}[data-ogsc] .apt-email-copy{color:#e6edf7!important}[data-ogsc] .apt-email-link{color:#ff9b78!important}[data-ogsc] .apt-email-footer{border-color:#38506f!important;color:#c4d0e0!important}@media screen and (max-width:600px){.apt-email-outer{padding:16px!important}.apt-email-header{padding:24px!important}.apt-email-content{padding:28px 22px 12px!important}.apt-email-footer-wrap{padding:20px 22px 24px!important}.apt-email-title{font-size:24px!important;line-height:1.2!important}}</style></head><body style="margin:0;padding:0;background:#f5f7f9;color:#14213a;"><table role="presentation" class="apt-email-shell" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7f9;"><tr><td class="apt-email-outer" style="padding:32px 16px;"><table role="presentation" class="apt-email-panel" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #d7dde5;border-radius:12px;overflow:hidden;"><tr><td class="apt-email-header" style="padding:28px 32px;background:#0a1a33;">${logo}</td></tr><tr><td style="height:4px;background:#c94a1d;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td class="apt-email-content" style="padding:36px 32px 20px;"><h1 class="apt-email-title" style="margin:0 0 24px;color:#14213a;font-family:Arial,sans-serif;font-size:27px;line-height:1.16;letter-spacing:-0.5px;">${escapeHtml(subject)}</h1>${body}</td></tr><tr><td class="apt-email-footer-wrap" style="padding:24px 32px 28px;border-top:1px solid #d7dde5;"><p class="apt-email-footer" style="margin:0;color:#516176;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">APT Tennis Club · Brasília<br />Beyond the Court</p></td></tr></table></td></tr></table></body></html>`;
}

function recipients(value: string | string[]) {
  return [...new Set((Array.isArray(value) ? value : value.split(","))
    .map((email) => email.trim().toLowerCase())
    .filter((email) => emailPattern.test(email)))];
}

export function managementRecipients() {
  const currentEnv = runtimeEnv();
  return recipients(currentEnv.APT_APPLICATION_TO_EMAIL || currentEnv.APT_ADMIN_EMAILS || "");
}

export function managementReplyTo() {
  return managementRecipients()[0];
}

function emailConfiguration(input: EmailInput) {
  const currentEnv = runtimeEnv();
  const to = recipients(input.to);
  const from = currentEnv.APT_RESEND_FROM_EMAIL;
  if (!currentEnv.RESEND_API_KEY || !from || !to.length) return null;
  return { currentEnv, to, from };
}

type EmailSendResult =
  | { outcome: "not_configured"; status: "not_configured" }
  | { outcome: "rejected"; status: "failed" }
  | { outcome: "accepted"; status: "sent"; providerMessageId: string }
  | { outcome: "ambiguous"; status: "failed"; issue: "provider_response_ambiguous" | "provider_id_missing" | "send_result_unknown" };

// Only documented rejection codes prove that Resend did not accept this request.
const rejectionCodes: Record<number, readonly string[]> = {
  400: ["invalid_idempotency_key", "validation_error"],
  401: ["missing_api_key", "restricted_api_key"],
  403: ["invalid_permission", "restricted_api_key", "suspended_api_key", "validation_error"],
  404: ["not_found"], 405: ["method_not_allowed"],
  422: ["invalid_attachment", "invalid_parameter", "missing_required_field", "missing_required_parameter"],
  429: ["daily_quota_exceeded", "monthly_quota_exceeded", "rate_limit_exceeded"],
};

async function sendAptEmailDetailed(input: EmailInput, configuration = emailConfiguration(input)): Promise<EmailSendResult> {
  if (!configuration) return { outcome: "not_configured", status: "not_configured" };
  const { currentEnv, to, from } = configuration;
  if (input.signal?.aborted) return { outcome: "rejected", status: "failed" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: input.signal ? AbortSignal.any([input.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${currentEnv.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "APT-Tennis-Club/1.0",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to,
        ...(input.replyTo && emailPattern.test(input.replyTo) ? { reply_to: input.replyTo } : {}),
        subject: input.subject,
        text: input.text,
        html: emailHtml(input.subject, input.text, currentEnv.APT_PUBLIC_URL),
        tags: [{ name: "flow", value: input.flow }, { name: "source", value: "apt" }],
      }),
    });
    const payload = await response.json() as { id?: unknown; name?: unknown };
    if (!response.ok) return rejectionCodes[response.status]?.includes(String(payload?.name))
      ? { outcome: "rejected", status: "failed" }
      : { outcome: "ambiguous", status: "failed", issue: "provider_response_ambiguous" };
    return typeof payload?.id === "string" && /^[a-z0-9_-]{1,128}$/i.test(payload.id)
      ? { outcome: "accepted", status: "sent", providerMessageId: payload.id }
      : { outcome: "ambiguous", status: "failed", issue: "provider_id_missing" };
  } catch {
    return { outcome: "ambiguous", status: "failed", issue: "send_result_unknown" };
  }
}

export async function sendAptEmail(input: EmailInput): Promise<EmailDeliveryStatus> {
  return (await sendAptEmailDetailed(input)).status;
}

export function sendManagementEmail(input: Omit<EmailInput, "to">): Promise<EmailDeliveryStatus> {
  return sendAptEmail({ ...input, to: managementRecipients() });
}

export function sendMemberEmail(input: Omit<EmailInput, "to"> & { to: string }): Promise<EmailDeliveryStatus> {
  return sendAptEmail(input);
}

export function sendBillingTransitionEmails(input: {
  kind: "confirmed" | "attention";
  member: { id: string; name: string; email: string };
  paymentId: string;
  providerStatus: string;
}, signal?: AbortSignal) {
  return queueAndProcessBillingEmails(input, signal);
}

function retryDelay(attempt: number) {
  const minutes = [1, 5, 15, 60, 360][Math.min(attempt, 4)];
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function checkoutReminderContext(memberId: string, signal?: AbortSignal): Promise<CheckoutReminderContext | null> {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  const [member, subscription] = await Promise.all([
    db<CheckoutReminderContext["member"][]>("members", {
      query: { select: "id,name,email,participation_status", id: `eq.${memberId}`, limit: "1" },
    }).then((rows) => rows[0]),
    db<CheckoutReminderContext["subscription"][]>("subscriptions", {
      query: {
        select: "status,asaas_checkout_id,asaas_checkout_url,asaas_checkout_expires_at",
        member_id: `eq.${memberId}`,
        limit: "1",
      },
    }).then((rows) => rows[0]),
  ]);
  return member && subscription ? { member, subscription } : null;
}

function activeCheckout(context: CheckoutReminderContext | null) {
  if (!context) return false;
  const { member, subscription } = context;
  return member.participation_status === "awaiting_payment"
    && subscription.status === "awaiting_payment"
    && Boolean(subscription.asaas_checkout_id && subscription.asaas_checkout_url)
    && Boolean(subscription.asaas_checkout_expires_at)
    && new Date(subscription.asaas_checkout_expires_at || 0).getTime() > Date.now();
}

async function suppressBillingEmail(delivery: BillingEmailDelivery, reason: string, signal?: AbortSignal, claim?: string) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  const now = new Date().toISOString();
  const rows = await db<Array<{ id: string }>>("billing_email_deliveries", {
    method: "PATCH", prefer: "return=representation",
    query: { id: `eq.${delivery.id}`, status: "in.(pending,failed)", send_claimed_at: claim ? `eq.${claim}` : "is.null", select: "id" },
    body: { status: "suppressed", send_claimed_at: null, last_error: reason, updated_at: now },
  });
  return rows.some((row) => row.id === delivery.id) ? "suppressed" as const : "review_required" as const;
}

async function billingEmailSuppressionReason(delivery: BillingEmailDelivery, signal?: AbortSignal): Promise<string | null> {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  if (delivery.kind === "checkout_reminder") {
    const context = await checkoutReminderContext(delivery.member_id, signal);
    if (!activeCheckout(context) || context?.subscription.asaas_checkout_id !== delivery.checkout_id) {
      return "Checkout pago, substituído ou expirado antes do lembrete.";
    }
  } else {
    const [members, subscriptions, payments] = await Promise.all([
      db<Array<{ participation_status: string }>>("members", { query: { select: "participation_status", id: `eq.${delivery.member_id}`, limit: "1" } }),
      db<Array<{ status: string; asaas_subscription_id: string | null; asaas_customer_id: string | null }>>("subscriptions", { query: { select: "status,asaas_subscription_id,asaas_customer_id", member_id: `eq.${delivery.member_id}`, limit: "1" } }),
      db<Array<{ asaas_payment_id: string; status: string; due_date: string | null; paid_at: string | null; created_at: string }>>("payments", { query: { select: "asaas_payment_id,status,due_date,paid_at,created_at", member_id: `eq.${delivery.member_id}`, order: "created_at.desc", limit: "500" } }),
    ]);
    const member = members[0];
    const subscription = subscriptions[0];
    if (!member || !subscription || isProtectedMembership(member.participation_status) || ["cancelled", "courtesy", "cancel_at_period_end"].includes(subscription.status)) {
      return "Participação encerrada ou definida manualmente antes do envio.";
    }
    let currentPayments: AsaasPaymentSnapshot[] = payments.map((payment) => ({ id: payment.asaas_payment_id, status: payment.status, dueDate: payment.due_date || undefined, paymentDate: payment.paid_at || undefined, dateCreated: payment.created_at }));
    let providerStatus: string | undefined;
    if (delivery.kind === "attention") {
      const path = subscription.asaas_subscription_id
        ? `/subscriptions/${encodeURIComponent(subscription.asaas_subscription_id)}/payments`
        : `/payments?${new URLSearchParams(subscription.asaas_customer_id ? { customer: subscription.asaas_customer_id } : { externalReference: delivery.member_id })}`;
      if (subscription.asaas_subscription_id) {
        const response = await asaasRequest(`/subscriptions/${encodeURIComponent(subscription.asaas_subscription_id)}`, { signal });
        if (response.status === 404) providerStatus = "DELETED";
        else if (response.ok) providerStatus = ((await response.json()) as { status?: string }).status;
        else throw new Error("Não foi possível revalidar a assinatura antes do aviso.");
        if (["CANCELLED", "CANCELED", "INACTIVE", "DELETED"].includes((providerStatus || "").toUpperCase())) return "Renovação encerrada no Asaas antes do aviso.";
      }
      currentPayments = await asaasPaymentHistory(path, signal);
      if (currentPayments.some((payment) => payment.externalReference && payment.externalReference !== delivery.member_id)) throw new Error("Histórico financeiro pertence a outro cadastro.");
    } else if (payments.length === 500) {
      throw new Error("Histórico local incompleto antes da confirmação.");
    }
    const decision = billingDecision({
      payments: currentPayments,
      memberStatus: member.participation_status, subscriptionStatus: subscription.status,
      recurring: Boolean(subscription.asaas_subscription_id), providerStatus, today: saoPauloDate(),
    });
    if (!decision.notice || decision.notice.kind !== delivery.kind || decision.notice.paymentId !== delivery.payment_id
      || (delivery.kind === "attention" && decision.notice.providerStatus !== (delivery.provider_status || "").toUpperCase().replace(/^PAYMENT_/, ""))) {
      return "Situação financeira liquidada, encerrada ou substituída antes do envio.";
    }
  }
  return null;
}

async function deliverBillingEmail(delivery: BillingEmailDelivery, signal?: AbortSignal) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  const reason = await billingEmailSuppressionReason(delivery, signal);
  if (reason) return suppressBillingEmail(delivery, reason, signal);
  const input: EmailInput = {
    to: delivery.recipient_email,
    subject: delivery.subject,
    text: delivery.body_text,
    ...(delivery.reply_to ? { replyTo: delivery.reply_to } : {}),
    flow: delivery.flow,
    idempotencyKey: delivery.dedupe_key,
    signal,
  };
  const configuration = emailConfiguration(input);
  const now = new Date().toISOString();
  if (!configuration) {
    await db("billing_email_deliveries", { method: "PATCH", query: { id: `eq.${delivery.id}`, status: "in.(pending,failed)", send_claimed_at: "is.null" }, body: { status: "failed", attempt_count: delivery.attempt_count + 1, next_attempt_at: retryDelay(delivery.attempt_count), last_error: "not_configured", updated_at: now } });
    return "not_configured" as const;
  }
  const claimed = await db<Array<{ id: string }>>("billing_email_deliveries", {
    method: "PATCH", prefer: "return=representation",
    query: { id: `eq.${delivery.id}`, status: "in.(pending,failed)", send_claimed_at: "is.null", next_attempt_at: `lte.${now}`, select: "id" },
    body: { send_claimed_at: now, attempt_count: delivery.attempt_count + 1, last_error: "send_result_unknown", updated_at: now },
  });
  if (!claimed.some((row) => row.id === delivery.id)) return "review_required" as const;
  // A receipt or a manual decision may have arrived while the durable claim was being saved.
  let finalReason: string | null;
  try {
    finalReason = await billingEmailSuppressionReason(delivery, signal);
  } catch {
    // No POST occurred, so a checked release can safely return this attempt to the existing backoff.
    try {
      const released = await db<Array<{ id: string }>>("billing_email_deliveries", {
        method: "PATCH", prefer: "return=representation",
        query: { id: `eq.${delivery.id}`, status: "in.(pending,failed)", send_claimed_at: `eq.${now}`, select: "id" },
        body: { status: "failed", send_claimed_at: null, next_attempt_at: retryDelay(delivery.attempt_count), last_error: "pre_send_validation_failed", updated_at: new Date().toISOString() },
      });
      return released.some((row) => row.id === delivery.id) ? "failed" as const : "review_required" as const;
    } catch { return "review_required" as const; }
  }
  if (finalReason) return suppressBillingEmail(delivery, finalReason, signal, now).catch(() => "review_required" as const);
  const result = await sendAptEmailDetailed(input, configuration);
  try {
    const rows = await db<Array<{ id: string }>>("billing_email_deliveries", {
      method: "PATCH", prefer: "return=representation",
      query: { id: `eq.${delivery.id}`, status: "in.(pending,failed)", send_claimed_at: `eq.${now}`, select: "id" },
      body: result.outcome === "accepted"
        ? { status: "sent", provider_message_id: result.providerMessageId, sent_at: new Date().toISOString(), send_claimed_at: null, last_error: null, updated_at: new Date().toISOString() }
        : result.outcome === "ambiguous"
          ? { last_error: result.issue, updated_at: new Date().toISOString() }
          : { status: "failed", send_claimed_at: null, next_attempt_at: retryDelay(delivery.attempt_count), last_error: result.status, updated_at: new Date().toISOString() },
    });
    if (!rows.some((row) => row.id === delivery.id)) return "review_required" as const;
  } catch {
    // The durable claim survives failed result persistence, including an expired work signal.
    return "review_required" as const;
  }
  return result.outcome === "ambiguous" ? "review_required" as const : result.status;
}

export async function retryBillingEmailDeliveries(limit = 25, dedupeKeys: string[] = [], signal?: AbortSignal) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  const deliveries = await db<BillingEmailDelivery[]>("billing_email_deliveries", {
    query: {
      select: "id,dedupe_key,member_id,payment_id,checkout_id,kind,recipient_email,reply_to,subject,body_text,flow,status,attempt_count,provider_status,send_claimed_at",
      status: "in.(pending,failed)",
      send_claimed_at: "is.null",
      next_attempt_at: `lte.${new Date().toISOString()}`,
      ...(dedupeKeys.length ? { dedupe_key: `in.(${dedupeKeys.join(",")})` } : {}),
      order: "next_attempt_at.asc",
      limit: String(limit),
    },
  });
  return Promise.all(deliveries.map(async (delivery) => {
    try {
      return await deliverBillingEmail(delivery, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      await db("billing_email_deliveries", {
        method: "PATCH", query: { id: `eq.${delivery.id}`, status: "in.(pending,failed)", send_claimed_at: "is.null" },
        body: { status: "failed", attempt_count: delivery.attempt_count + 1, next_attempt_at: retryDelay(delivery.attempt_count), last_error: error instanceof Error ? error.message.slice(0, 500) : "Falha de revalidação", updated_at: new Date().toISOString() },
      });
      return "failed" as const;
    }
  }));
}

function checkoutReminderBody(name: string, checkoutUrl: string, reminder: 1 | 2) {
  return reminder === 1
    ? `Olá, ${name}.\n\nVimos que seu cadastro no APT foi concluído, mas a mensalidade ainda está pendente. Se você ainda não finalizou, retome pelo checkout seguro do Asaas:\n${checkoutUrl}\n\nSe o pagamento já foi feito, pode desconsiderar esta mensagem. A confirmação acontece automaticamente.`
    : `Olá, ${name}.\n\nSeu checkout da mensalidade APT expira em breve. Para concluir sua entrada, finalize o pagamento pelo link seguro do Asaas:\n${checkoutUrl}\n\nSe você já pagou, pode desconsiderar. O APT não recebe nem armazena os dados do seu cartão.`;
}

export async function ensureCheckoutPaymentReminders(memberId: string, signal?: AbortSignal) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  const context = await checkoutReminderContext(memberId, signal);
  if (!activeCheckout(context)) return { available: false, queued: 0 };
  const { member, subscription } = context!;
  const checkoutId = subscription.asaas_checkout_id!;
  const checkoutUrl = subscription.asaas_checkout_url!;
  const expiresAt = new Date(subscription.asaas_checkout_expires_at!).getTime();
  const checkoutCreatedAt = expiresAt - 1_440 * 60_000;
  const reminders = ([
    { number: 1 as const, afterMinutes: 60, subject: "Seu pagamento APT ficou pendente", flow: "checkout_payment_reminder_1" },
    { number: 2 as const, afterMinutes: 1_200, subject: "Seu checkout APT expira em breve", flow: "checkout_payment_reminder_2" },
  ]).map(({ number, afterMinutes, subject, flow }) => ({
    dedupe_key: `apt-checkout-reminder-${number}-member-${member.id}-${checkoutId}`,
    member_id: member.id,
    payment_id: null,
    checkout_id: checkoutId,
    kind: "checkout_reminder",
    audience: "member",
    recipient_email: member.email,
    reply_to: managementReplyTo() || null,
    subject,
    body_text: checkoutReminderBody(member.name, checkoutUrl, number),
    flow,
    provider_status: "AWAITING_PAYMENT",
    next_attempt_at: new Date(checkoutCreatedAt + afterMinutes * 60_000).toISOString(),
  }));
  await Promise.all(reminders.map((delivery) => db("billing_email_deliveries", {
    method: "POST",
    query: { on_conflict: "dedupe_key" },
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: delivery,
  })));
  return { available: true, queued: reminders.length };
}

export async function sendManualCheckoutReminder(memberId: string) {
  const context = await checkoutReminderContext(memberId);
  if (!activeCheckout(context)) return { status: "unavailable" as const };
  const { member, subscription } = context!;
  const checkoutId = subscription.asaas_checkout_id!;
  const hourKey = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");
  const dedupeKey = `apt-checkout-reminder-manual-member-${member.id}-${checkoutId}-${hourKey}`;
  await supabaseAdmin("billing_email_deliveries", {
    method: "POST",
    query: { on_conflict: "dedupe_key" },
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: {
      dedupe_key: dedupeKey,
      member_id: member.id,
      payment_id: null,
      checkout_id: checkoutId,
      kind: "checkout_reminder",
      audience: "member",
      recipient_email: member.email,
      reply_to: managementReplyTo() || null,
      subject: "Seu checkout APT — link para concluir",
      body_text: checkoutReminderBody(member.name, subscription.asaas_checkout_url!, 1),
      flow: "checkout_payment_reminder_manual",
      provider_status: "AWAITING_PAYMENT",
      next_attempt_at: new Date().toISOString(),
    },
  });
  await retryBillingEmailDeliveries(1, [dedupeKey]);
  const delivery = (await supabaseAdmin<Array<{ status: "pending" | "failed" | "sent" | "suppressed" }>>(
    "billing_email_deliveries",
    { query: { select: "status", dedupe_key: `eq.${dedupeKey}`, limit: "1" } },
  ))[0];
  return { status: delivery?.status || "failed" };
}

async function queueAndProcessBillingEmails(input: {
  kind: "confirmed" | "attention";
  member: { id: string; name: string; email: string };
  paymentId: string;
  providerStatus: string;
}, signal?: AbortSignal) {
  const db = <T>(resource: string, options: Parameters<typeof supabaseAdmin>[1] = {}) => supabaseAdmin<T>(resource, { ...options, signal });
  const confirmed = input.kind === "confirmed";
  const pixMonthlyDue = input.providerStatus === "PIX_MONTHLY_DUE";
  const management = managementRecipients();
  const memberKey = `apt-payment-${input.kind}-member-${input.paymentId}`;
  const deliveries = [
    {
      dedupe_key: memberKey,
      member_id: input.member.id,
      payment_id: input.paymentId,
      kind: input.kind,
      audience: "member",
      recipient_email: input.member.email,
      reply_to: null,
      subject: confirmed ? "Pagamento confirmado — mensalidade APT" : pixMonthlyDue ? "Mensalidade Pix pendente — APT" : "Atualização necessária na sua mensalidade APT",
      body_text: confirmed
        ? `Olá, ${input.member.name}.\n\nO Asaas confirmou e o APT registrou sua mensalidade. Se o seu cadastro já estiver concluído, o acesso está liberado. Caso ainda não esteja, finalize-o pelo link enviado pela gestão.`
        : pixMonthlyDue
          ? `Olá, ${input.member.name}.\n\nSeu período mensal anterior terminou e ainda não identificamos o Pix deste mês. Para continuar no ranking, faça o Pix pela chave habitual do APT ou peça à gestão o link para mensalidade recorrente no cartão. Se já pagou, desconsidere esta mensagem. Caso não queira continuar no ranking, avise a gestão para retirarmos seu nome sem problema.`
          : `Olá, ${input.member.name}.\n\nO Asaas informou uma atualização na sua mensalidade. Acesse a área de membros para acompanhar a situação ou fale com a gestão do APT.`,
      flow: confirmed ? "payment_confirmed_member" : "payment_attention_member",
      provider_status: input.providerStatus,
    },
    ...(management.length ? [{
      dedupe_key: `apt-payment-${input.kind}-management-${input.paymentId}`,
      member_id: input.member.id,
      payment_id: input.paymentId,
      kind: input.kind,
      audience: "management",
      recipient_email: management.join(","),
      reply_to: input.member.email,
      subject: confirmed ? `Pagamento confirmado — ${input.member.name}` : pixMonthlyDue ? `Pix mensal pendente — ${input.member.name}` : `Mensalidade requer atenção — ${input.member.name}`,
      body_text: confirmed
        ? `O Asaas confirmou a mensalidade de ${input.member.name}.\n\nE-mail: ${input.member.email}\nStatus do provedor: ${input.providerStatus}\n\nA participação foi atualizada automaticamente no APT.`
        : pixMonthlyDue
          ? `O período pago por Pix de ${input.member.name} terminou sem um novo recebimento confirmado.\n\nE-mail: ${input.member.email}\nStatus do provedor: ${input.providerStatus}\n\nO integrante foi movido para atenção financeira e entrou na fila de cobrança por WhatsApp.`
          : `O Asaas informou uma atualização que requer atenção na mensalidade de ${input.member.name}.\n\nE-mail: ${input.member.email}\nStatus do provedor: ${input.providerStatus}\n\nAcesse a gestão para conferir o histórico financeiro.`,
      flow: confirmed ? "payment_confirmed_management" : "payment_attention_management",
      provider_status: input.providerStatus,
    }] : []),
  ];

  await Promise.all(deliveries.map((delivery) => db("billing_email_deliveries", {
    method: "POST",
    query: { on_conflict: "dedupe_key" },
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: delivery,
  })));
  return retryBillingEmailDeliveries(deliveries.length, deliveries.map((delivery) => delivery.dedupe_key), signal);
}
