-- Kniffel Online with people who have no account yet.
--
-- The host shares a link with a random code (/online/beitreten/<code>).
-- Whoever opens it picks a name and joins the lobby. Without an account the
-- app signs them in anonymously (Supabase anonymous sign-ins), so they are a
-- user like any other for the tables, the policies and Realtime; they just
-- have no email and no profile. Joining goes through /api/online like every
-- other write.
--
-- Needs Authentication → Sign In / Providers → "Allow anonymous sign-ins".
-- Run after 20261111140000_online_service_grants.sql.

alter table public.online_games add column if not exists invite_code text;

create unique index if not exists online_games_invite_code_key
  on public.online_games (invite_code) where invite_code is not null;
