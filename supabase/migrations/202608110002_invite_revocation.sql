alter table public.invites
  add column if not exists revoked_at timestamptz;

create index if not exists invites_active_application_idx
  on public.invites(application_id, expires_at desc)
  where used_at is null and revoked_at is null;
