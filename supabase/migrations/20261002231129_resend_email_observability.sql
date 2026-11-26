alter table public.billing_email_deliveries
  add column if not exists provider_message_id text,
  add column if not exists send_claimed_at timestamptz;

alter table public.billing_email_deliveries
  add constraint billing_email_deliveries_provider_message_id_check
  check (provider_message_id is null or provider_message_id ~ '^[A-Za-z0-9_-]{1,128}$');

create unique index billing_email_deliveries_provider_message_id_idx
  on public.billing_email_deliveries(provider_message_id) where provider_message_id is not null;

-- No FK to the outbox: authenticated events can arrive before the send ID is saved.
create table public.email_delivery_events (
  event_id text primary key check (event_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  provider_email_id text not null check (provider_email_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  event_type text not null check (event_type in (
    'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.failed',
    'email.bounced', 'email.complained', 'email.opened', 'email.clicked', 'email.suppressed'
  )),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

create index email_delivery_events_provider_email_idx
  on public.email_delivery_events(provider_email_id, occurred_at desc);

alter table public.email_delivery_events enable row level security;
revoke all on public.email_delivery_events from public, anon, authenticated;
revoke all on public.email_delivery_events from service_role;
grant select, insert on public.email_delivery_events to service_role;

-- Aggregate the complete ledger; frequent opens/clicks cannot hide older delivery evidence.
create view public.email_delivery_observations with (security_invoker = true) as
select provider_email_id, count(*) as event_total,
  min(occurred_at) filter (where event_type = 'email.sent') as accepted_at,
  min(occurred_at) filter (where event_type = 'email.delivered') as delivered_at,
  max(occurred_at) filter (where event_type = 'email.opened') as opened_at,
  max(occurred_at) filter (where event_type = 'email.clicked') as clicked_at,
  max(occurred_at) filter (where event_type = 'email.delivery_delayed') as delayed_at,
  max(occurred_at) filter (where event_type = 'email.failed') as failed_at,
  max(occurred_at) filter (where event_type = 'email.bounced') as bounced_at,
  max(occurred_at) filter (where event_type = 'email.complained') as complained_at,
  max(occurred_at) filter (where event_type = 'email.suppressed') as suppressed_at
from public.email_delivery_events
group by provider_email_id;

revoke all on public.email_delivery_observations from public, anon, authenticated;
revoke all on public.email_delivery_observations from service_role;
grant select on public.email_delivery_observations to service_role;
