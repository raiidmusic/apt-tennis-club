-- Prepared only. Apply after the canonical-target ownership preflight is reviewed.
begin;

create unique index if not exists subscriptions_asaas_customer_unique
  on public.subscriptions(asaas_customer_id) where asaas_customer_id is not null;

alter table public.webhook_events
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now();
create index if not exists webhook_events_recovery_idx
  on public.webhook_events(last_attempt_at nulls first, received_at)
  where processed_at is null and attempt_count < 10;

alter table public.members
  add column if not exists billing_last_attempt_at timestamptz,
  add column if not exists billing_last_success_at timestamptz,
  add column if not exists billing_reconciliation_issue text
    check (billing_reconciliation_issue in ('missing_subscription', 'missing_provider', 'provider_unresolved', 'reconciliation_failed'));
create index if not exists members_billing_recovery_idx
  on public.members(billing_last_attempt_at nulls first, id)
  where participation_status in ('pending_payment', 'awaiting_payment', 'active', 'delinquent');

-- Existing server-only security is retained, including the new operation fields.
alter table public.webhook_events enable row level security;
alter table public.members enable row level security;
revoke all on public.webhook_events, public.members from anon, authenticated;
grant all on public.webhook_events, public.members to service_role;

commit;
