-- A link is two-way from the moment it exists.
--
-- Until now the invitee's device accepted an invite and then, in a second
-- call, recorded the way back with link_back(). When that second call failed
-- (no connection, a device closed in between, link_back() not set up) the
-- link stayed one-way: Tim showed up linked on Jan's side, Jan did not on
-- Tim's. Now
--
-- - accept_invite() accepts and links back in one transaction, so both
--   directions exist or neither does;
-- - inviting someone who already invited you (or links you) connects both
--   sides at once, with no invite left to accept.
--
-- Run after 20261111120000_mutual_links.sql.

-- Accepts an invite and records the inviter as the invitee's roster player
-- p_player_id, both directions at once.
create or replace function public.accept_invite(p_link_id uuid, p_player_id text, p_player_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  update public.player_links
  set status = 'accepted', accepted_at = now()
  where id = p_link_id and status = 'pending' and invitee_id = auth.uid();
  if not found then
    raise exception 'invite not found';
  end if;
  perform public.link_back(p_link_id, p_player_id, p_player_name);
end;
$$;

revoke execute on function public.accept_invite(uuid, text, text) from public, anon;
grant execute on function public.accept_invite(uuid, text, text) to authenticated;

-- As before, plus: when the invitee already links the inviter, both links
-- are accepted right away.
create or replace function public.invite_player(p_player_id text, p_player_name text, p_handle text)
returns public.player_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := trim(p_handle);
  v_invitee uuid;
  v_link public.player_links;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_uid) then
    raise exception 'no profile';
  end if;
  if v_handle !~ '^[^#]+#[0-9]{4}$' then
    raise exception 'invalid handle';
  end if;

  select user_id into v_invitee from public.profiles
  where lower(name) = lower(trim(split_part(v_handle, '#', 1))) and tag = split_part(v_handle, '#', 2);
  if v_invitee is null then
    raise exception 'unknown handle';
  end if;
  if v_invitee = v_uid then
    raise exception 'own handle';
  end if;
  if (select count(*) from public.player_links where owner_id = v_uid and player_id <> p_player_id) >= 50 then
    raise exception 'too many links';
  end if;

  insert into public.player_links (owner_id, player_id, player_name, invitee_id, status)
  values (v_uid, p_player_id, trim(p_player_name), v_invitee, 'pending')
  on conflict on constraint player_links_owner_player_key do update
    set player_name = excluded.player_name,
        -- Same account: keep an accepted link. Another account: start over.
        status = case when public.player_links.invitee_id = excluded.invitee_id
                      then public.player_links.status else 'pending' end,
        accepted_at = case when public.player_links.invitee_id = excluded.invitee_id
                           then public.player_links.accepted_at end,
        invitee_id = excluded.invitee_id
  returning * into v_link;

  -- They invited (or link) this user too: both said yes, so both are linked.
  if exists (
    select 1 from public.player_links where owner_id = v_invitee and invitee_id = v_uid
  ) then
    update public.player_links
    set status = 'accepted', accepted_at = coalesce(accepted_at, now())
    where (owner_id = v_uid and invitee_id = v_invitee)
       or (owner_id = v_invitee and invitee_id = v_uid);
    select * into v_link from public.player_links where id = v_link.id;
  end if;
  return v_link;
end;
$$;

revoke execute on function public.invite_player(text, text, text) from public, anon;
grant execute on function public.invite_player(text, text, text) to authenticated;
