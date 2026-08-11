alter table public.members
  alter column cpf_hash drop not null,
  alter column cpf_last4 drop not null;

alter table public.invites
  alter column application_id drop not null,
  add column if not exists member_id uuid references public.members(id) on delete cascade;

alter table public.invites
  add constraint invites_exactly_one_target_check
  check ((application_id is not null)::integer + (member_id is not null)::integer = 1);

create index if not exists invites_member_idx on public.invites(member_id);

alter table public.subscriptions
  alter column amount_cents drop default,
  add column if not exists asaas_checkout_url text,
  add column if not exists checkout_attempted_at timestamptz;

alter table public.webhook_events
  alter column processed_at drop not null,
  alter column processed_at drop default,
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists processing_error text;
