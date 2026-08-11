create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  whatsapp text not null,
  age integer not null check (age between 25 and 45),
  city text not null,
  profession text not null,
  class_level text not null,
  referrer text not null,
  answers jsonb not null default '{}'::jsonb,
  consent_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','in_review','awaiting_info','approved','rejected','invite_sent','registered')),
  email_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  application_id uuid unique references public.applications(id),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  whatsapp text not null,
  cpf_hash text not null unique,
  cpf_last4 text not null,
  class_level text,
  participation_status text not null default 'awaiting_payment' check (participation_status in ('awaiting_payment','active','pending_payment','delinquent','cancellation_requested','cancelled','courtesy','inactive')),
  twinner_url text,
  whatsapp_community_url text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  asaas_customer_id text,
  asaas_subscription_id text unique,
  asaas_checkout_id text unique,
  status text not null default 'pending_configuration' check (status in ('pending_configuration','awaiting_payment','active','past_due','cancel_at_period_end','cancelled','courtesy')),
  amount_cents integer not null default 2000,
  billing_cycle text not null default 'MONTHLY',
  next_due_date date,
  overdue_since date,
  current_period_end date,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  asaas_payment_id text not null unique,
  status text not null,
  value_cents integer not null default 0,
  due_date date,
  paid_at timestamptz,
  invoice_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  body text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists applications_status_created_idx on public.applications(status, created_at desc);
create index if not exists invites_application_idx on public.invites(application_id);
create index if not exists members_status_idx on public.members(participation_status);
create index if not exists subscriptions_status_due_idx on public.subscriptions(status, next_due_date);
create index if not exists payments_member_created_idx on public.payments(member_id, created_at desc);

alter table public.applications enable row level security;
alter table public.invites enable row level security;
alter table public.members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.admin_notes enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.applications, public.invites, public.members, public.subscriptions, public.payments, public.webhook_events, public.admin_notes, public.audit_logs from anon, authenticated;
grant all on public.applications, public.invites, public.members, public.subscriptions, public.payments, public.webhook_events, public.admin_notes, public.audit_logs to service_role;
