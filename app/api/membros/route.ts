import { requireAdmin } from "../../../lib/auth";
import { asaasPaymentHistory, asaasRequest, pixSearchPeriod } from "../../../lib/asaas";
import { sendManualCheckoutReminder } from "../../../lib/apt-email";
import { emailObservabilityConfiguration, memberEmailCommunications } from "../../../lib/email-observability";
import { billingOperationsSummary } from "../../../lib/billing-recovery";
import { saoPauloDate } from "../../../lib/billing-state";
import { financialPayment, memberFinancialView, type BillingPaymentRow } from "../../../lib/billing-view";
import { claimBillingCustomer, reconcileMemberBilling } from "../../../lib/billing-reconciliation";
import { requireTrustedOrigin } from "../../../lib/request-security";
import { runtimeEnv, supabaseAdmin, supabaseAll, SupabaseRequestError } from "../../../lib/supabase-server";

export const maxDuration = 60;

type MemberRow = {
  id: string; auth_user_id: string | null; name: string; email: string; whatsapp: string; class_level: string | null;
  participation_status: string; twinner_url: string | null; whatsapp_community_url: string | null;
  joined_at: string | null; created_at: string;
  billing_last_attempt_at?: string | null; billing_last_success_at?: string | null; billing_reconciliation_issue?: string | null;
};
type SubscriptionRow = {
  member_id: string; status: string; amount_cents: number; next_due_date: string | null;
  current_period_end: string | null; overdue_since: string | null; cancel_at_period_end: boolean;
  asaas_checkout_id: string | null; asaas_checkout_url: string | null; asaas_checkout_expires_at: string | null;
  asaas_customer_id: string | null; asaas_subscription_id: string | null;
};
type MemberNote = { id: string; body: string; created_by: string; created_at: string };
type AsaasPayment = {
  id?: string; status?: string; value?: number; paymentDate?: string; clientPaymentDate?: string; dateCreated?: string;
  customer?: string; billingType?: string; externalReference?: string;
};
type AsaasCustomer = { id?: string; name?: string; cpfCnpj?: string; externalReference?: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const manualStatuses = new Set(["pending_payment", "courtesy", "inactive"]);
const memberSelect = "id,auth_user_id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at,billing_last_attempt_at,billing_last_success_at,billing_reconciliation_issue";
const subscriptionSelect = "member_id,status,amount_cents,next_due_date,current_period_end,overdue_since,cancel_at_period_end,asaas_customer_id,asaas_subscription_id,asaas_checkout_id,asaas_checkout_url,asaas_checkout_expires_at";
const paymentSelect = "id,member_id,asaas_payment_id,status,value_cents,due_date,paid_at,invoice_url,created_at,payload";

function projectMember(member: MemberRow, subscription: SubscriptionRow | null | undefined, payments: BillingPaymentRow[]) {
  const financial = memberFinancialView(member.participation_status, subscription, payments, saoPauloDate());
  const firstOverdue = payments.filter((payment) => financial.overdueInvoiceIds.includes(payment.id)).map((payment) => payment.due_date!).sort()[0];
  return {
    id: member.id, name: member.name, email: member.email, whatsapp: member.whatsapp, classLevel: member.class_level,
    twinnerUrl: member.twinner_url, whatsappCommunityUrl: member.whatsapp_community_url, joinedAt: member.joined_at, createdAt: member.created_at,
    participationStatus: member.participation_status, subscriptionStatus: subscription?.status || "pending_configuration",
    amountCents: subscription?.amount_cents || 0, billingMethod: financial.billingMethod,
    nextDueDate: financial.nextInvoiceDueDate, currentPeriodEnd: financial.paidThrough,
    overdueDays: firstOverdue ? Math.max(0, Math.floor((Date.parse(`${saoPauloDate()}T00:00:00Z`) - Date.parse(`${firstOverdue}T00:00:00Z`)) / 86_400_000)) : 0,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false, checkoutExpiresAt: subscription?.asaas_checkout_expires_at,
    checkoutStarted: Boolean(subscription?.asaas_checkout_id && !financial.covered && financial.billingMethod !== "pix"), checkoutAvailable: financial.checkoutAvailable,
    billingLastAttemptAt: member.billing_last_attempt_at || null, billingLastSuccessAt: member.billing_last_success_at || null,
    billingIssue: member.billing_reconciliation_issue || null, financial,
  };
}

async function communicationIssues() {
  const deliveries = await supabaseAll<{ member_id: string; status: string; send_claimed_at: string | null; provider_message_id: string | null }>("billing_email_deliveries", { query: { select: "id,member_id,status,send_claimed_at,provider_message_id" } });
  const observations = await supabaseAll<{ provider_email_id: string; delivered_at: string | null; failed_at: string | null; bounced_at: string | null; complained_at: string | null; suppressed_at: string | null }>("email_delivery_observations", { query: { select: "provider_email_id,delivered_at,failed_at,bounced_at,complained_at,suppressed_at", order: "provider_email_id.asc" } });
  const byId = new Map(observations.map((row) => [row.provider_email_id, row]));
  return new Set(deliveries.filter((row) => {
    if (row.status === "failed" || (row.send_claimed_at && row.status !== "sent" && row.status !== "suppressed")) return true;
    const observed = row.provider_message_id ? byId.get(row.provider_message_id) : undefined;
    return [observed?.failed_at, observed?.bounced_at, observed?.complained_at, observed?.suppressed_at].some((date) => date && (!observed?.delivered_at || date >= observed.delivered_at));
  }).map((row) => row.member_id));
}

function allowedClubUrl(value: string, host: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const query = new URL(request.url).searchParams;
    if (query.get("operations") === "1") return Response.json({ operations: await billingOperationsSummary() });
    const memberId = query.get("id");
    if (memberId) {
      if (!uuidPattern.test(memberId)) return Response.json({ error: "Integrante inválido." }, { status: 400 });
      const [memberRows, subscriptionRows, payments, notes] = await Promise.all([
        supabaseAdmin<MemberRow[]>("members", { query: { select: memberSelect, id: `eq.${memberId}`, limit: "1" } }),
        supabaseAdmin<SubscriptionRow[]>("subscriptions", { query: { select: subscriptionSelect, member_id: `eq.${memberId}`, limit: "1" } }),
        supabaseAll<BillingPaymentRow>("payments", { query: { select: paymentSelect, member_id: `eq.${memberId}`, order: "created_at.desc,id.desc" } }),
        supabaseAdmin<MemberNote[]>("admin_notes", { query: { select: "id,body,created_by,created_at", member_id: `eq.${memberId}`, order: "created_at.asc" } }),
      ]);
      const member = memberRows[0];
      if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
      const subscription = subscriptionRows[0] || null;
      const isIncompleteRecord = !member.joined_at && ["pending_payment", "awaiting_payment"].includes(member.participation_status);
      const canDelete = isIncompleteRecord && !member.auth_user_id && payments.length === 0 && !subscription?.asaas_customer_id && !subscription?.asaas_subscription_id && !subscription?.asaas_checkout_id;
      return Response.json({ emailConfiguration: emailObservabilityConfiguration(), member: {
        ...projectMember(member, subscription, payments), canDelete,
        deleteBlockedReason: canDelete ? null : "Este atleta já possui acesso ou histórico financeiro. Inative o cadastro para preservar a auditoria.",
        payments: payments.map(financialPayment), notes, communications: await memberEmailCommunications(memberId),
      } });
    }
    const [members, subscriptions, payments, issues] = await Promise.all([
      supabaseAll<MemberRow>("members", { query: { select: memberSelect, order: "name.asc,id.asc" } }),
      supabaseAll<SubscriptionRow>("subscriptions", { query: { select: subscriptionSelect, order: "member_id.asc" } }),
      supabaseAll<BillingPaymentRow>("payments", { query: { select: paymentSelect, order: "created_at.asc,id.asc" } }),
      communicationIssues(),
    ]);
    const byMember = new Map(subscriptions.map((row) => [row.member_id, row]));
    return Response.json({
      members: members.map((member) => ({ ...projectMember(member, byMember.get(member.id), payments.filter((payment) => payment.member_id === member.id)), communicationIssue: issues.has(member.id) })),
      payments: payments.map(financialPayment),
    });
  } catch (error) {
    return Response.json({ error: error instanceof SupabaseRequestError ? error.message : "Não foi possível carregar os integrantes." }, { status: error instanceof SupabaseRequestError ? error.status : 500 });
  }
}

export async function POST(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: string; action?: string; paymentId?: string; confirmation?: string; from?: string; to?: string; offset?: number };
    if (!payload.id || !uuidPattern.test(payload.id) || !["refresh_billing", "resend_checkout", "find_pix", "link_pix"].includes(payload.action || "")) {
      return Response.json({ error: "Atualização financeira inválida." }, { status: 400 });
    }

    if (payload.action === "find_pix") {
      const member = (await supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,auth_user_id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", id: `eq.${payload.id}`, limit: "1" },
      }))[0];
      if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
      const period = pixSearchPeriod(payload, saoPauloDate());
      const signal = AbortSignal.timeout(45_000);
      const offset = payload.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 500) return Response.json({ error: "Página de Pix inválida." }, { status: 400 });
      const query = new URLSearchParams({ billingType: "PIX", status: "RECEIVED", "paymentDate[ge]": period.from, "paymentDate[le]": period.to });
      const history = await asaasPaymentHistory(`/payments?${query}`, signal);
      const providerPayments = [...new Map(history.filter((payment) => payment.id).map((payment) => [payment.id!, payment] as const)).values()]
        .filter((payment) => !payment.externalReference || payment.externalReference === member.id);
      const candidatePaymentIds = providerPayments.map((payment) => payment.id!);
      const [localPayments, subscriptions] = await Promise.all([
        candidatePaymentIds.length
          ? Promise.all(Array.from({ length: Math.ceil(candidatePaymentIds.length / 100) }, (_, index) => supabaseAdmin<Array<{ asaas_payment_id: string }>>("payments", { query: { select: "asaas_payment_id", asaas_payment_id: `in.(${candidatePaymentIds.slice(index * 100, index * 100 + 100).join(",")})`, limit: "100" }, signal }))).then((pages) => pages.flat())
          : Promise.resolve([]),
        supabaseAdmin<Array<{ member_id: string; asaas_customer_id: string | null }>>("subscriptions", { query: { select: "member_id,asaas_customer_id" }, signal }),
      ]);
      const localPaymentIds = new Set(localPayments.map((payment) => payment.asaas_payment_id));
      const customerOwner = new Map(subscriptions.filter((subscription) => subscription.asaas_customer_id).map((subscription) => [subscription.asaas_customer_id!, subscription.member_id] as const));
      const remaining = providerPayments.filter((payment) => !localPaymentIds.has(payment.id!) && payment.customer && (!customerOwner.has(payment.customer) || customerOwner.get(payment.customer) === member.id));
      const selected = remaining.slice(offset, offset + 40);
      const candidates: Array<{ id: string; payerName: string; cpfLast4: string | null; valueCents: number; paidAt: string | null; identityMatch: "reference" | "customer" | "unverified" }> = [];
      const customers = new Map<string, AsaasCustomer>();
      // Bound customer lookups too; every omitted page has an explicit continuation offset.
      for (let index = 0; index < selected.length; index += 4) {
        const page = await Promise.all(selected.slice(index, index + 4).map(async (payment) => {
          let customer = customers.get(payment.customer!);
          if (!customer) {
            const response = await asaasRequest(`/customers/${encodeURIComponent(payment.customer!)}`, { signal });
            if (!response.ok) throw new SupabaseRequestError("O Asaas não respondeu à identificação do Pix.", 502);
            customer = await response.json() as AsaasCustomer;
            customers.set(payment.customer!, customer);
          }
          if (customer.externalReference && customer.externalReference !== member.id) return null;
          return {
            id: payment.id!, payerName: customer.name || "Pagador não identificado",
            cpfLast4: (customer.cpfCnpj || "").replace(/\D/g, "").slice(-4) || null,
            valueCents: Math.round((payment.value || 0) * 100),
            paidAt: payment.paymentDate || payment.clientPaymentDate || null,
            identityMatch: (payment.externalReference === member.id || customer.externalReference === member.id ? "reference" : customerOwner.get(payment.customer!) === member.id ? "customer" : "unverified") as "reference" | "customer" | "unverified",
          };
        }));
        candidates.push(...page.filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate)));
      }
      const nextOffset = offset + selected.length < remaining.length ? offset + selected.length : null;
      return Response.json({ candidates, period, truncated: nextOffset !== null, nextOffset });
    }

    if (payload.action === "link_pix") {
      if (!payload.paymentId || !/^pay_[a-z0-9_]+$/i.test(payload.paymentId)) return Response.json({ error: "Pix inválido." }, { status: 400 });
      const member = (await supabaseAdmin<MemberRow[]>("members", {
        query: { select: "id,auth_user_id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", id: `eq.${payload.id}`, limit: "1" },
      }))[0];
      if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
      if (payload.confirmation !== member.name) return Response.json({ error: "Confirme o nome completo do atleta antes de vincular o Pix." }, { status: 400 });
      const paymentResponse = await asaasRequest(`/payments/${encodeURIComponent(payload.paymentId)}`);
      if (!paymentResponse.ok) throw new SupabaseRequestError("O Asaas não confirmou esse Pix.", 502);
      const payment = await paymentResponse.json() as AsaasPayment;
      if (payment.billingType !== "PIX" || (payment.status || "").toUpperCase() !== "RECEIVED" || !payment.customer) {
        return Response.json({ error: "Somente um Pix confirmado pode ser vinculado." }, { status: 409 });
      }
      if (payment.externalReference && payment.externalReference !== member.id) return Response.json({ error: "Esse Pix já referencia outro cadastro." }, { status: 409 });
      const [linkedPayment, linkedCustomer, currentSubscription] = await Promise.all([
        supabaseAdmin<Array<{ member_id: string }>>("payments", { query: { select: "member_id", asaas_payment_id: `eq.${payload.paymentId}`, limit: "1" } }).then((rows) => rows[0]),
        supabaseAdmin<Array<{ member_id: string }>>("subscriptions", { query: { select: "member_id", asaas_customer_id: `eq.${payment.customer}`, limit: "2" } }),
        supabaseAdmin<Array<{ id: string; asaas_customer_id: string | null }>>("subscriptions", { query: { select: "id,asaas_customer_id", member_id: `eq.${member.id}`, limit: "1" } }).then((rows) => rows[0]),
      ]);
      if (linkedPayment && linkedPayment.member_id !== member.id) return Response.json({ error: "Esse Pix já está vinculado a outro atleta." }, { status: 409 });
      if (linkedCustomer.some((subscription) => subscription.member_id !== member.id)) return Response.json({ error: "O pagador deste Pix já está vinculado a outro atleta." }, { status: 409 });
      if (currentSubscription?.asaas_customer_id && currentSubscription.asaas_customer_id !== payment.customer) {
        return Response.json({ error: "O atleta já possui outro cliente financeiro no Asaas." }, { status: 409 });
      }
      let subscriptionId = currentSubscription?.id;
      if (!subscriptionId) {
        const monthlyValue = Number(runtimeEnv().ASAAS_MONTHLY_VALUE);
        if (!Number.isFinite(monthlyValue) || monthlyValue <= 0) return Response.json({ error: "A mensalidade ainda não está configurada." }, { status: 503 });
        subscriptionId = crypto.randomUUID();
        await supabaseAdmin("subscriptions", { method: "POST", body: { id: subscriptionId, member_id: member.id, status: "pending_configuration", amount_cents: Math.round(monthlyValue * 100), billing_cycle: "MONTHLY" } });
      }
      await claimBillingCustomer(member.id, { id: subscriptionId, asaas_customer_id: currentSubscription?.asaas_customer_id || null }, payment.customer);
      const result = await reconcileMemberBilling(member.id, { paymentId: payload.paymentId });
      await supabaseAdmin("audit_logs", {
        method: "POST",
        body: { actor: admin.email, action: "payment.pix_linked_by_operator", entity_type: "member", entity_id: member.id, metadata: { asaas_payment_id: payload.paymentId, provider_status: payment.status, value_cents: Math.round((payment.value || 0) * 100) } },
      });
      return Response.json({ linked: true, reconciled: result });
    }

    const result = await reconcileMemberBilling(payload.id);
    if (payload.action === "resend_checkout") {
      const delivery = await sendManualCheckoutReminder(payload.id);
      if (delivery.status === "unavailable" || delivery.status === "suppressed") {
        return Response.json({ error: "Este checkout já foi pago, substituído ou expirou." }, { status: 409 });
      }
      await supabaseAdmin("audit_logs", {
        method: "POST",
        body: { actor: admin.email, action: "member.checkout_reminder_sent", entity_type: "member", entity_id: payload.id, metadata: { delivery: delivery.status } },
      });
      return Response.json({ reminded: true, delivery: delivery.status, reconciled: result });
    }
    await supabaseAdmin("audit_logs", {
      method: "POST",
      body: { actor: admin.email, action: "member.billing_reconciled", entity_type: "member", entity_id: payload.id, metadata: result },
    });
    return Response.json({ reconciled: true, ...result });
  } catch (error) {
    if (error instanceof SupabaseRequestError && error.status === 400) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ error: "Não foi possível confirmar a situação no Asaas antes desta ação." }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: string; participationStatus?: string; twinnerUrl?: string; whatsappCommunityUrl?: string; note?: string };
    if (!payload.id || !uuidPattern.test(payload.id)) return Response.json({ error: "Integrante inválido." }, { status: 400 });
    const updates: Record<string, string | null> = {};
    if (payload.participationStatus !== undefined) {
      if (!manualStatuses.has(payload.participationStatus)) return Response.json({ error: "Esse estado não pode ser alterado manualmente." }, { status: 400 });
      updates.participation_status = payload.participationStatus;
    }
    if (payload.twinnerUrl !== undefined) {
      const value = payload.twinnerUrl.trim();
      if (value && !allowedClubUrl(value, "tweener.club")) return Response.json({ error: "Use um link seguro do Tweener." }, { status: 400 });
      updates.twinner_url = value || null;
    }
    if (payload.whatsappCommunityUrl !== undefined) {
      const value = payload.whatsappCommunityUrl.trim();
      if (value && !allowedClubUrl(value, "chat.whatsapp.com")) return Response.json({ error: "Use um convite seguro da comunidade do WhatsApp." }, { status: 400 });
      updates.whatsapp_community_url = value || null;
    }
    const note = payload.note?.trim() || "";
    if (note.length > 1_200) return Response.json({ error: "A nota deve ter até 1.200 caracteres." }, { status: 400 });
    if (Object.keys(updates).length === 0 && !note) return Response.json({ error: "Nenhuma alteração foi informada." }, { status: 400 });

    const rows = Object.keys(updates).length
      ? await supabaseAdmin<MemberRow[]>("members", {
        method: "PATCH", query: { id: `eq.${payload.id}` }, prefer: "return=representation",
        body: { ...updates, updated_at: new Date().toISOString() },
      })
      : await supabaseAdmin<MemberRow[]>("members", { query: { select: "id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", id: `eq.${payload.id}`, limit: "1" } });
    const member = rows[0];
    if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
    const savedNote = note ? (await supabaseAdmin<MemberNote[]>("admin_notes", { method: "POST", prefer: "return=representation", body: { member_id: member.id, body: note, created_by: admin.email } }))[0] : undefined;
    await supabaseAdmin("audit_logs", {
      method: "POST",
      body: { actor: admin.email, action: "member.management_updated", entity_type: "member", entity_id: member.id, metadata: { changed: Object.keys(updates), note_recorded: Boolean(savedNote) } },
    });
    return Response.json({ member: { id: member.id, participationStatus: member.participation_status, twinnerUrl: member.twinner_url, whatsappCommunityUrl: member.whatsapp_community_url }, note: savedNote });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o integrante." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: string; confirmation?: string };
    if (!payload.id || !uuidPattern.test(payload.id)) return Response.json({ error: "Integrante inválido." }, { status: 400 });
    const [member, subscription, payment] = await Promise.all([
      supabaseAdmin<MemberRow[]>("members", { query: { select: "id,auth_user_id,name,email,whatsapp,class_level,participation_status,twinner_url,whatsapp_community_url,joined_at,created_at", id: `eq.${payload.id}`, limit: "1" } }).then((rows) => rows[0]),
      supabaseAdmin<Array<{ asaas_customer_id: string | null; asaas_subscription_id: string | null; asaas_checkout_id: string | null }>>("subscriptions", { query: { select: "asaas_customer_id,asaas_subscription_id,asaas_checkout_id", member_id: `eq.${payload.id}`, limit: "1" } }).then((rows) => rows[0]),
      supabaseAdmin<Array<{ id: string }>>("payments", { query: { select: "id", member_id: `eq.${payload.id}`, limit: "1" } }).then((rows) => rows[0]),
    ]);
    if (!member) return Response.json({ error: "Integrante não encontrado." }, { status: 404 });
    if (payload.confirmation !== member.name) return Response.json({ error: "Digite o nome completo do atleta para confirmar a exclusão." }, { status: 400 });
    const isIncompleteRecord = !member.joined_at && ["pending_payment", "awaiting_payment"].includes(member.participation_status);
    if (!isIncompleteRecord || member.auth_user_id || payment || subscription?.asaas_customer_id || subscription?.asaas_subscription_id || subscription?.asaas_checkout_id) {
      return Response.json({ error: "Este atleta já possui acesso ou histórico financeiro. Inative o cadastro para preservar a auditoria." }, { status: 409 });
    }
    await supabaseAdmin("audit_logs", {
      method: "POST",
      body: { actor: admin.email, action: "member.incomplete_record_deletion_authorized", entity_type: "member", entity_id: member.id, metadata: { name: member.name, email: member.email } },
    });
    await supabaseAdmin("members", { method: "DELETE", query: { id: `eq.${member.id}` } });
    return Response.json({ deleted: true, id: member.id });
  } catch {
    return Response.json({ error: "Não foi possível excluir o cadastro incompleto." }, { status: 500 });
  }
}
