-- Anonymous daily quiz results, for the global score distribution (#26).
--
-- Nothing in here identifies a player: `token` is a random UUID the browser
-- makes up for one day only, so it blocks a second submission of the same day
-- but cannot link days together.

create table public.quiz_results (
  id bigint generated always as identity primary key,
  quiz_date date not null,
  token uuid not null,
  points smallint[] not null,
  total smallint not null,
  created_at timestamptz not null default now(),
  constraint quiz_results_points_check check (
    array_length(points, 1) = 3
    and 0 <= all (points)
    and 100 >= all (points)
  ),
  constraint quiz_results_total_check check (total = points[1] + points[2] + points[3]),
  constraint quiz_results_day_token_key unique (quiz_date, token)
);

-- Closed to the API: only the two functions below read or write it.
alter table public.quiz_results enable row level security;
revoke all on table public.quiz_results from anon, authenticated;

-- Records one day's result. Only today's quiz counts — a day either side of
-- UTC covers every time zone. A repeated token for the same day is ignored.
create function public.submit_quiz_result(p_date date, p_token uuid, p_points smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_date not between current_date - 1 and current_date + 1 then
    raise exception 'quiz date out of range';
  end if;
  insert into public.quiz_results (quiz_date, token, points, total)
  values (p_date, p_token, p_points, p_points[1] + p_points[2] + p_points[3])
  on conflict on constraint quiz_results_day_token_key do nothing;
end;
$$;

-- How many players reached each day total; the app groups them into bars.
create function public.get_quiz_distribution(p_date date)
returns table (total smallint, players bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.total, count(*)
  from public.quiz_results r
  where r.quiz_date = p_date
  group by r.total
  order by r.total;
$$;

revoke execute on function public.submit_quiz_result(date, uuid, smallint[]) from public;
revoke execute on function public.get_quiz_distribution(date) from public;
grant execute on function public.submit_quiz_result(date, uuid, smallint[]) to anon, authenticated;
grant execute on function public.get_quiz_distribution(date) to anon, authenticated;
