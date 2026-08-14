-- The current APT flow owns member creation in public.members.
-- This legacy trigger duplicated Auth users into public.profiles and could
-- abort every signup when its old enum/search-path assumptions drifted.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
