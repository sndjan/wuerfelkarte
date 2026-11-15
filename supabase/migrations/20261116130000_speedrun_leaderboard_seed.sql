-- The Speedrun leaderboard also returns each run's seed, so anyone can play
-- the same dice from the list. Changes the result columns, hence drop + create.
--
-- Run after 20261116120000_speedrun_leaderboard.sql.

drop function if exists public.get_speedrun_leaderboard(integer);

create function public.get_speedrun_leaderboard(p_limit integer default 10)
returns table (rank bigint, name text, emoji text, wertung_ms integer, seed text, is_me boolean)
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
      l.seed,
      l.user_id = auth.uid() as is_me
    from public.speedrun_leaderboard l
    join public.profiles p on p.user_id = l.user_id
  )
  select r.rank, r.name, r.emoji, r.wertung_ms, r.seed, r.is_me
  from ranked r
  where r.rank <= least(greatest(p_limit, 1), 100) or r.is_me
  order by r.rank;
$$;

revoke execute on function public.get_speedrun_leaderboard(integer) from public;
grant execute on function public.get_speedrun_leaderboard(integer) to anon, authenticated;
