-- Links go both ways.
--
-- When Tim accepts Jan's invite, Tim's devices pick (or add) a roster entry
-- for Jan and record it with link_back(), as an accepted link from Tim to
-- Jan. From then on each side shows the other under their account name and
-- sends them every match they played together, past ones included. Ending
-- the link from either side ends both directions.

-- Records the owner of an accepted invite as one of the invitee's roster
-- players. When the invitee already links that account (an earlier link or
-- their own invite to the owner), that one is accepted instead.
create or replace function public.link_back(p_link_id uuid, p_player_id text, p_player_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  select owner_id into v_owner from public.player_links
  where id = p_link_id and invitee_id = v_uid and status = 'accepted';
  if v_owner is null then
    raise exception 'link not found';
  end if;

  update public.player_links
  set status = 'accepted', accepted_at = coalesce(accepted_at, now())
  where owner_id = v_uid and invitee_id = v_owner;
  if found then
    return;
  end if;

  insert into public.player_links (owner_id, player_id, player_name, invitee_id, status, accepted_at)
  values (v_uid, p_player_id, trim(p_player_name), v_owner, 'accepted', now())
  on conflict on constraint player_links_owner_player_key do update
    set invitee_id = excluded.invitee_id,
        player_name = excluded.player_name,
        status = 'accepted',
        accepted_at = now();
end;
$$;

revoke execute on function public.link_back(uuid, text, text) from public, anon;
grant execute on function public.link_back(uuid, text, text) to authenticated;

-- Ending a link ends the way back too; the shared matches of each direction go
-- with it, copies already in a history stay.
create or replace function public.player_links_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.player_links
    where owner_id = old.owner_id and invitee_id = old.invitee_id and id <> old.id and status = 'accepted'
  ) then
    delete from public.shared_matches where owner_id = old.owner_id and recipient_id = old.invitee_id;
  end if;
  -- The reverse row's own trigger then finds this row already gone.
  delete from public.player_links where owner_id = old.invitee_id and invitee_id = old.owner_id;
  return old;
end;
$$;

-- Moving a roster player to another account ends the old account's way back.
create or replace function public.player_links_moved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.invitee_id <> new.invitee_id then
    delete from public.shared_matches where owner_id = old.owner_id and recipient_id = old.invitee_id;
    delete from public.player_links where owner_id = old.invitee_id and invitee_id = old.owner_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.player_links_moved() from public, anon, authenticated;

drop trigger if exists player_links_moved on public.player_links;
create trigger player_links_moved
  after update of invitee_id on public.player_links
  for each row execute function public.player_links_moved();
