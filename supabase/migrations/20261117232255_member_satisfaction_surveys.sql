create table public.member_surveys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  title text not null check (length(title) between 1 and 200),
  heyform_id text not null unique check (heyform_id ~ '^[A-Za-z0-9_-]{6,128}$'),
  active boolean not null default false,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  fields jsonb not null check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) between 1 and 30),
  eligible_member_ids uuid[] not null,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at),
  check (cardinality(eligible_member_ids) <= 10000)
);

create table public.member_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.member_surveys(id),
  member_id uuid not null references public.members(id),
  heyform_submission_id text not null unique check (heyform_submission_id ~ '^[A-Za-z0-9_-]{6,128}$'),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  received_at timestamptz not null default now(),
  unique (survey_id, member_id)
);

create index member_survey_responses_member_id_idx on public.member_survey_responses(member_id);

alter table public.member_surveys enable row level security;
alter table public.member_survey_responses enable row level security;
revoke all on public.member_surveys, public.member_survey_responses from public, anon, authenticated;
revoke all on public.member_surveys, public.member_survey_responses from service_role;
grant select on public.member_surveys to service_role;
-- Responses are immutable snapshots. Corrections/deletions require a coordinated administrative procedure.
grant select, insert on public.member_survey_responses to service_role;
