import { runtimeEnv } from "./supabase-server";

export type EmailDeliveryStatus = "sent" | "failed" | "not_configured";

type EmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  flow: string;
  idempotencyKey: string;
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
    return `<a href="${url}" style="color:#c94a1d;text-decoration:underline;text-underline-offset:3px;">${url}</a>`;
  }).join("");
}

function emailHtml(subject: string, text: string, publicUrl?: string) {
  const logo = publicUrl
    ? `<img src="${escapeHtml(`${publicUrl.replace(/\/$/, "")}/apt-logo-light.png`)}" width="92" alt="APT Tennis Club" style="display:block;width:92px;height:auto;border:0;" />`
    : `<strong style="font-family:Arial,sans-serif;font-size:24px;letter-spacing:-1px;">apt.</strong>`;
  const body = text.trim().split(/\n{2,}/).filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 18px;color:#25344a;font-family:Arial,sans-serif;font-size:16px;line-height:1.65;">${linkedText(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f5f7f9;color:#14213a;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7f9;"><tr><td style="padding:32px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #d7dde5;border-radius:12px;overflow:hidden;"><tr><td style="padding:28px 32px;background:#0a1a33;">${logo}</td></tr><tr><td style="height:4px;background:#c94a1d;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td style="padding:36px 32px 20px;"><h1 style="margin:0 0 24px;color:#14213a;font-family:Arial,sans-serif;font-size:27px;line-height:1.16;letter-spacing:-0.5px;">${escapeHtml(subject)}</h1>${body}</td></tr><tr><td style="padding:24px 32px 28px;border-top:1px solid #d7dde5;"><p style="margin:0;color:#516176;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">APT Tennis Club · Brasília<br />Beyond the Court</p></td></tr></table></td></tr></table></body></html>`;
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
