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
