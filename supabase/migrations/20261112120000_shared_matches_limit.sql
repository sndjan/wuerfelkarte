-- A cap on the matches one account can share.
--
-- shared_matches only checked the size of a single match, so an account with
-- one accepted link could keep inventing match ids and fill the database (and
-- the other player's history, which downloads them). No real history comes
-- near this number. Run after 20261110130000_player_links.sql.

create or replace function public.shared_matches_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An upsert of an existing match also runs insert triggers before it turns
  -- into an update, so that one must not count against the limit.
  if not exists (
    select 1 from public.shared_matches
    where owner_id = new.owner_id and recipient_id = new.recipient_id
      and game = new.game and match_id = new.match_id
  ) and (
    select count(*) from public.shared_matches
    where owner_id = new.owner_id and recipient_id = new.recipient_id
  ) >= 5000 then
    raise exception 'too many shared matches';
  end if;
  return new;
end;
$$;

revoke execute on function public.shared_matches_limit() from public, anon, authenticated;

drop trigger if exists shared_matches_limit on public.shared_matches;
create trigger shared_matches_limit
  before insert on public.shared_matches
  for each row execute function public.shared_matches_limit();

-- A stored match is a few kilobytes; 200 kB each left the cap above toothless.
alter table public.shared_matches drop constraint if exists shared_matches_size_check;
alter table public.shared_matches
  add constraint shared_matches_size_check check (pg_column_size(match) <= 20000) not valid;
