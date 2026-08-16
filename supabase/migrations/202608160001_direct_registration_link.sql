alter table public.group_registration_links
  add column if not exists flow text not null default 'community'
  check (flow in ('community', 'direct'));

create index if not exists group_registration_links_direct_active_idx
  on public.group_registration_links(expires_at desc)
  where revoked_at is null and flow = 'direct';
