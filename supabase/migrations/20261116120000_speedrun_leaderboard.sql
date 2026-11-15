-- Global leaderboard of the Kniffel-Speedrun (category Klassisch).
--
-- One row per account: its best Wertungszeit on a random seed. Runs on a
-- typed-in seed never get here. Name and emoji come from the profile, so
-- only accounts that picked a name show up.
--
-- The server cannot check the clock, so the checks are plausibility only.
--
-- Run after 20261115130000_profile_emoji.sql.

create table if not exists public.speedrun_leaderboard (
  user_id uuid primary key references auth.users (id) on delete cascade,
  time_ms integer not null,
  strafe_ms integer not null,
  wertung_ms integer not null,
  seed text not null,
  updated_at timestamptz not null default now(),
  constraint speedrun_leaderboard_time_check check (time_ms between 20000 and 7200000),
  constraint speedrun_leaderboard_strafe_check check (strafe_ms between 0 and 400000),
  constraint speedrun_leaderboard_wertung_check check (wertung_ms = time_ms + strafe_ms),
  constraint speedrun_leaderboard_seed_check check (length(seed) between 1 and 64)
);

create index if not exists speedrun_leaderboard_wertung_idx
  on public.speedrun_leaderboard (wertung_ms);

-- Closed to the API: only the two functions below read or write it.
alter table public.speedrun_leaderboard enable row level security;
revoke all on table public.speedrun_leaderboard from anon, authenticated;

-- Records a run of the signed-in account; only a better one replaces its entry.
create or replace function public.submit_speedrun_best(
  p_time_ms integer,
  p_strafe_ms integer,
  p_seed text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  insert into public.speedrun_leaderboard (user_id, time_ms, strafe_ms, wertung_ms, seed)
  values (v_uid, p_time_ms, p_strafe_ms, p_time_ms + p_strafe_ms, p_seed)
  on conflict (user_id) do update
    set time_ms = excluded.time_ms,
        strafe_ms = excluded.strafe_ms,
        wertung_ms = excluded.wertung_ms,
        seed = excluded.seed,
        updated_at = now()
    where excluded.wertung_ms < public.speedrun_leaderboard.wertung_ms;
end;
$$;

-- The top `p_limit` accounts with a name, plus the caller's own row when it
-- is further down. `rank` counts ties as the same place.
create or replace function public.get_speedrun_leaderboard(p_limit integer default 10)
returns table (rank bigint, name text, emoji text, wertung_ms integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      rank() over (order by l.wertung_ms, l.updated_at) as rank,
      p.name,
      p.emoji,
      l.wertung_ms,
      l.user_id = auth.uid() as is_me
    from public.speedrun_leaderboard l
    join public.profiles p on p.user_id = l.user_id
  )
  select r.rank, r.name, r.emoji, r.wertung_ms, r.is_me
  from ranked r
  where r.rank <= least(greatest(p_limit, 1), 100) or r.is_me
  order by r.rank;
$$;

revoke execute on function public.submit_speedrun_best(integer, integer, text) from public, anon;
revoke execute on function public.get_speedrun_leaderboard(integer) from public;
grant execute on function public.submit_speedrun_best(integer, integer, text) to authenticated;
grant execute on function public.get_speedrun_leaderboard(integer) to anon, authenticated;
