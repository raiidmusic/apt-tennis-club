import { runtimeEnv, supabaseAdmin } from "./supabase-server";

export type EmailDeliveryStatus = "sent" | "failed" | "not_configured";

type EmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  flow: string;
  idempotencyKey: string;
};

type BillingEmailDelivery = {
  id: string;
  dedupe_key: string;
  recipient_email: string;
  reply_to: string | null;
  subject: string;
  body_text: string;
  flow: string;
  status: "pending" | "failed" | "sent" | "suppressed";
  attempt_count: number;
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

export async function sendAptEmail(input: EmailInput): Promise<EmailDeliveryStatus> {
  const currentEnv = runtimeEnv();
  const to = recipients(input.to);
  const from = currentEnv.APT_RESEND_FROM_EMAIL;
  if (!currentEnv.RESEND_API_KEY || !from || !to.length) return "not_configured";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
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
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export function sendManagementEmail(input: Omit<EmailInput, "to">) {
  return sendAptEmail({ ...input, to: managementRecipients() });
}

export function sendMemberEmail(input: Omit<EmailInput, "to"> & { to: string }) {
  return sendAptEmail(input);
}

export function sendBillingTransitionEmails(input: {
  kind: "confirmed" | "attention";
  member: { id: string; name: string; email: string };
  paymentId: string;
  providerStatus: string;
}) {
  return queueAndProcessBillingEmails(input);
}

function retryDelay(attempt: number) {
  const minutes = [1, 5, 15, 60, 360][Math.min(attempt, 4)];
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function deliverBillingEmail(delivery: BillingEmailDelivery) {
  const deliveryStatus = await sendAptEmail({
    to: delivery.recipient_email,
    subject: delivery.subject,
    text: delivery.body_text,
    ...(delivery.reply_to ? { replyTo: delivery.reply_to } : {}),
    flow: delivery.flow,
    idempotencyKey: delivery.dedupe_key,
  });
  const now = new Date().toISOString();
  await supabaseAdmin("billing_email_deliveries", {
    method: "PATCH",
    query: { id: `eq.${delivery.id}`, status: "neq.sent" },
    body: deliveryStatus === "sent"
      ? { status: "sent", attempt_count: delivery.attempt_count + 1, sent_at: now, last_error: null, updated_at: now }
      : {
          status: "failed",
          attempt_count: delivery.attempt_count + 1,
          next_attempt_at: retryDelay(delivery.attempt_count),
          last_error: deliveryStatus,
          updated_at: now,
        },
  });
  return deliveryStatus;
}

export async function retryBillingEmailDeliveries(limit = 25, dedupeKeys: string[] = []) {
  const deliveries = await supabaseAdmin<BillingEmailDelivery[]>("billing_email_deliveries", {
    query: {
      select: "id,dedupe_key,recipient_email,reply_to,subject,body_text,flow,status,attempt_count",
      status: "in.(pending,failed)",
      next_attempt_at: `lte.${new Date().toISOString()}`,
      ...(dedupeKeys.length ? { dedupe_key: `in.(${dedupeKeys.join(",")})` } : {}),
      order: "next_attempt_at.asc",
      limit: String(limit),
    },
  });
  return Promise.all(deliveries.map(deliverBillingEmail));
}

async function queueAndProcessBillingEmails(input: {
  kind: "confirmed" | "attention";
  member: { id: string; name: string; email: string };
  paymentId: string;
  providerStatus: string;
}) {
  const confirmed = input.kind === "confirmed";
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
      subject: confirmed ? "Pagamento confirmado — mensalidade APT" : "Atualização necessária na sua mensalidade APT",
      body_text: confirmed
        ? `Olá, ${input.member.name}.\n\nO Asaas confirmou e o APT registrou sua mensalidade. Se o seu cadastro já estiver concluído, o acesso está liberado. Caso ainda não esteja, finalize-o pelo link enviado pela gestão.`
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
      subject: confirmed ? `Pagamento confirmado — ${input.member.name}` : `Mensalidade requer atenção — ${input.member.name}`,
      body_text: confirmed
        ? `O Asaas confirmou a mensalidade de ${input.member.name}.\n\nE-mail: ${input.member.email}\nStatus do provedor: ${input.providerStatus}\n\nA participação foi atualizada automaticamente no APT.`
        : `O Asaas informou uma atualização que requer atenção na mensalidade de ${input.member.name}.\n\nE-mail: ${input.member.email}\nStatus do provedor: ${input.providerStatus}\n\nAcesse a gestão para conferir o histórico financeiro.`,
      flow: confirmed ? "payment_confirmed_management" : "payment_attention_management",
      provider_status: input.providerStatus,
    }] : []),
  ];

  await Promise.all(deliveries.map((delivery) => supabaseAdmin("billing_email_deliveries", {
    method: "POST",
    query: { on_conflict: "dedupe_key" },
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: delivery,
  })));
  return retryBillingEmailDeliveries(deliveries.length, deliveries.map((delivery) => delivery.dedupe_key));
}
