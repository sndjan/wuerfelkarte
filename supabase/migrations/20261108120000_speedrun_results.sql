-- Anonymous Tagesrun results of the Kniffel-Speedrun, for the daily
-- distribution of Wertungszeiten.
--
-- Like quiz_results, nothing in here identifies a player: `token` is a random
-- UUID the browser makes up for one day only. The server cannot check the
-- clock, so the checks are plausibility only.

create table public.speedrun_results (
  id bigint generated always as identity primary key,
  run_date date not null,
  token uuid not null,
  time_ms integer not null,
  strafe_ms integer not null,
  wertung_ms integer not null,
  created_at timestamptz not null default now(),
  constraint speedrun_results_time_check check (time_ms between 10000 and 7200000),
  constraint speedrun_results_strafe_check check (strafe_ms between 0 and 400000),
  constraint speedrun_results_wertung_check check (wertung_ms = time_ms + strafe_ms),
  constraint speedrun_results_day_token_key unique (run_date, token)
);

-- Closed to the API: only the two functions below read or write it.
alter table public.speedrun_results enable row level security;
revoke all on table public.speedrun_results from anon, authenticated;

-- Records one day's ranked run. Only today's run counts — a day either side
-- of UTC covers every time zone. A repeated token for the same day is ignored.
create function public.submit_speedrun_result(
  p_date date,
  p_token uuid,
  p_time_ms integer,
  p_strafe_ms integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_date not between current_date - 1 and current_date + 1 then
    raise exception 'run date out of range';
  end if;
  insert into public.speedrun_results (run_date, token, time_ms, strafe_ms, wertung_ms)
  values (p_date, p_token, p_time_ms, p_strafe_ms, p_time_ms + p_strafe_ms)
  on conflict on constraint speedrun_results_day_token_key do nothing;
end;
$$;

-- How many players finished in each whole second; the app groups them into bars.
create function public.get_speedrun_distribution(p_date date)
returns table (seconds integer, players bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.wertung_ms / 1000, count(*)
  from public.speedrun_results r
  where r.run_date = p_date
  group by r.wertung_ms / 1000
  order by 1;
$$;

revoke execute on function public.submit_speedrun_result(date, uuid, integer, integer) from public;
revoke execute on function public.get_speedrun_distribution(date) from public;
grant execute on function public.submit_speedrun_result(date, uuid, integer, integer) to anon, authenticated;
grant execute on function public.get_speedrun_distribution(date) to anon, authenticated;
