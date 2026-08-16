create table if not exists public.billing_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  member_id uuid not null references public.members(id) on delete cascade,
  payment_id text not null,
  kind text not null check (kind in ('confirmed', 'attention')),
  audience text not null check (audience in ('member', 'management')),
  recipient_email text not null,
  reply_to text,
  subject text not null,
  body_text text not null,
  flow text not null,
  provider_status text not null,
  status text not null default 'pending' check (status in ('pending', 'failed', 'sent', 'suppressed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_email_deliveries_retry_idx
  on public.billing_email_deliveries(status, next_attempt_at)
  where status in ('pending', 'failed');

create index if not exists billing_email_deliveries_member_payment_idx
  on public.billing_email_deliveries(member_id, payment_id);

alter table public.billing_email_deliveries enable row level security;

revoke all on public.billing_email_deliveries from anon, authenticated;
grant all on public.billing_email_deliveries to service_role;

insert into public.billing_email_deliveries (
  dedupe_key, member_id, payment_id, kind, audience, recipient_email,
  subject, body_text, flow, provider_status, status, last_error
)
select
  concat(
    'apt-payment-',
    case when upper(payment.status) in ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH') then 'confirmed' else 'attention' end,
    '-', audience.value, '-', payment.asaas_payment_id
  ),
  payment.member_id,
  payment.asaas_payment_id,
  case when upper(payment.status) in ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH') then 'confirmed' else 'attention' end,
  audience.value,
  member.email,
  '',
  '',
  'historical_before_outbox',
  payment.status,
  'suppressed',
  'Evento anterior à fila persistente; nenhuma nova entrega foi gerada.'
from public.payments as payment
join public.members as member on member.id = payment.member_id
cross join (values ('member'), ('management')) as audience(value)
where upper(payment.status) in (
  'RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'OVERDUE', 'REFUNDED',
  'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'REPROVED_BY_RISK_ANALYSIS',
  'CREDIT_CARD_CAPTURE_REFUSED', 'DELETED'
)
on conflict (dedupe_key) do nothing;
