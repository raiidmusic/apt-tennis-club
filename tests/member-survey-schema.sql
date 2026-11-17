-- Run against a disposable PostgreSQL 17 database after the survey migration.
begin;
insert into public.members(id) values ('12345678-1234-4234-9234-123456789012');
insert into public.member_surveys(id,slug,title,heyform_id,opens_at,closes_at,fields,eligible_member_ids)
values ('32345678-1234-4234-9234-123456789012','test-campaign','Synthetic','form-test','2026-11-01','2026-12-01',
 '[{"id":"score","key":"score","title":"Score","kind":"opinion_scale"}]',
 array['12345678-1234-4234-9234-123456789012']::uuid[]);
set local role service_role;
insert into public.member_survey_responses(survey_id,member_id,heyform_submission_id,answers,content_hash)
values ('32345678-1234-4234-9234-123456789012','12345678-1234-4234-9234-123456789012','submission-test','{"score":4}',repeat('a',64));
reset role;
do $$
begin
  if not (select relrowsecurity from pg_class where oid='public.member_surveys'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.member_survey_responses'::regclass) then
    raise exception 'RLS must be enabled';
  end if;
  if has_table_privilege('anon','public.member_survey_responses','select')
    or has_table_privilege('authenticated','public.member_surveys','select')
    or has_table_privilege('authenticated','public.member_survey_responses','insert')
    or has_table_privilege('service_role','public.member_survey_responses','update')
    or has_table_privilege('service_role','public.member_survey_responses','delete') then
    raise exception 'Unexpected table privilege';
  end if;
  begin
    insert into public.member_survey_responses(survey_id,member_id,heyform_submission_id,answers,content_hash)
    values ('32345678-1234-4234-9234-123456789012','12345678-1234-4234-9234-123456789012','different-submission','{}',repeat('b',64));
    raise exception 'Duplicate member response was accepted';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.member_survey_responses) <> 1 then raise exception 'Response duplicated'; end if;
  raise notice 'PASS: private RLS/grants, service insert, immutable snapshot and unique member response';
end $$;
rollback;
