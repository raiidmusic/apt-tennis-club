alter table public.subscriptions
  add column if not exists asaas_checkout_expires_at timestamptz;

with completed_registration as (
  select log.entity_id, max(log.created_at) as completed_at
  from public.audit_logs as log
  where log.entity_type = 'member'
    and log.action in (
      'member.community_registration_completed',
      'member.direct_registration_completed',
      'member.recadastro_completed'
    )
  group by log.entity_id
)
update public.subscriptions as subscription
set asaas_checkout_expires_at = completed_registration.completed_at + interval '24 hours'
from completed_registration
where subscription.status = 'awaiting_payment'
  and subscription.asaas_checkout_id is not null
  and subscription.asaas_checkout_expires_at is null
  and completed_registration.entity_id = subscription.member_id::text;

alter table public.billing_email_deliveries
  add column if not exists checkout_id text,
  alter column payment_id drop not null;

alter table public.billing_email_deliveries
  drop constraint if exists billing_email_deliveries_kind_check,
  drop constraint if exists billing_email_deliveries_target_check;

alter table public.billing_email_deliveries
  add constraint billing_email_deliveries_kind_check
    check (kind in ('confirmed', 'attention', 'checkout_reminder')),
  add constraint billing_email_deliveries_target_check
    check (
      (payment_id is not null and checkout_id is null)
      or (payment_id is null and checkout_id is not null)
    );

create index if not exists billing_email_deliveries_member_checkout_idx
  on public.billing_email_deliveries(member_id, checkout_id)
  where checkout_id is not null;

alter table public.billing_email_deliveries enable row level security;

revoke all on public.billing_email_deliveries from anon, authenticated;
grant all on public.billing_email_deliveries to service_role;
