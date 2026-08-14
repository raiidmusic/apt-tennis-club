create table if not exists public.group_registration_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists group_registration_links_active_idx
  on public.group_registration_links(expires_at desc)
  where revoked_at is null;

alter table public.group_registration_links enable row level security;
revoke all on public.group_registration_links from anon, authenticated;
grant all on public.group_registration_links to service_role;

alter table public.applications
  alter column age drop not null,
  alter column city drop not null,
  alter column profession drop not null,
  alter column class_level drop not null,
  alter column referrer drop not null;
