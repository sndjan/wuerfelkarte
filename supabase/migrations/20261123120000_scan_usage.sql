-- Counts the scans of the paper Kniffelblock (/scan), so the open page cannot
-- run up the bill for the photo reader.
--
-- One row per visitor and day; the key is a salted hash of the IP made on the
-- server, so no IP is stored. The row with key '*' counts the whole site.
-- Only the server (secret key) calls take_scan; the table is closed to the API.

create table if not exists public.scan_usage (
  day date not null,
  key text not null,
  count integer not null default 0,
  primary key (day, key),
  constraint scan_usage_key_check check (length(key) between 1 and 64)
);

alter table public.scan_usage enable row level security;
revoke all on table public.scan_usage from anon, authenticated;

-- Counts one scan. Returns the scans this visitor has left today, -1 when the
-- visitor or the whole site is at its limit. Rows older than a week go.
create or replace function public.take_scan(p_key text, p_per_key integer, p_global integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_all integer;
  v_mine integer;
begin
  insert into public.scan_usage (day, key, count) values (v_day, '*', 1)
  on conflict (day, key) do update set count = public.scan_usage.count + 1
  returning count into v_all;
  if v_all > p_global then
    update public.scan_usage set count = count - 1 where day = v_day and key = '*';
    return -1;
  end if;

  insert into public.scan_usage (day, key, count) values (v_day, p_key, 1)
  on conflict (day, key) do update set count = public.scan_usage.count + 1
  returning count into v_mine;
  if v_mine > p_per_key then
    update public.scan_usage set count = count - 1 where day = v_day and key in (p_key, '*');
    return -1;
  end if;

  delete from public.scan_usage where day < v_day - 7;
  return p_per_key - v_mine;
end;
$$;

revoke all on function public.take_scan(text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_scan(text, integer, integer) to service_role;
grant select, insert, update, delete on table public.scan_usage to service_role;
