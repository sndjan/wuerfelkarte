-- Account names, and linking players by them instead of by email.
--
-- Every account picks a name and gets a four-digit tag, so "Jan#4821" is
-- unique even when many people are called Jan. Players are linked by that
-- handle; once a link is accepted, the owner's devices show the linked
-- player under the account's name everywhere, and follow it when it changes.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  tag text not null,
  updated_at timestamptz not null default now(),
  constraint profiles_name_check check (length(name) between 1 and 24 and name !~ '#' and name = trim(name)),
  constraint profiles_tag_check check (tag ~ '^[0-9]{4}$')
);

create unique index if not exists profiles_handle_key on public.profiles (lower(name), tag);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- Your own profile, and those of accounts you are linked with (either way,
-- invites included). Looking someone up by handle goes through invite_player.
drop policy if exists "Linked users read profiles" on public.profiles;
create policy "Linked users read profiles" on public.profiles
  for select to authenticated using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.player_links l
      where (l.owner_id = (select auth.uid()) and l.invitee_id = profiles.user_id)
         or (l.invitee_id = (select auth.uid()) and l.owner_id = profiles.user_id)
    )
  );

-- Sets the signed-in user's name. The tag stays if it is still free under
-- the new name; otherwise a free one is drawn.
create or replace function public.set_profile_name(p_name text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(p_name);
  v_tag text;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if length(v_name) not between 1 and 24 or v_name ~ '#' then
    raise exception 'invalid name';
  end if;

  select tag into v_tag from public.profiles where user_id = v_uid;
  if v_tag is null or exists (
    select 1 from public.profiles
    where lower(name) = lower(v_name) and tag = v_tag and user_id <> v_uid
  ) then
    v_tag := null;
    for i in 1..50 loop
      v_tag := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
      exit when not exists (
        select 1 from public.profiles where lower(name) = lower(v_name) and tag = v_tag
      );
      v_tag := null;
    end loop;
    if v_tag is null then
      raise exception 'name taken';
    end if;
  end if;

  insert into public.profiles (user_id, name, tag, updated_at)
  values (v_uid, v_name, v_tag, now())
  on conflict (user_id) do update set name = excluded.name, tag = excluded.tag, updated_at = now()
  returning * into v_profile;
  return v_profile;
end;
$$;

revoke execute on function public.set_profile_name(text) from public, anon;
grant execute on function public.set_profile_name(text) to authenticated;

-- Invites now name an account directly; emails are no longer involved.
alter table public.player_links alter column owner_email drop not null;
alter table public.player_links alter column invitee_email drop not null;
alter table public.player_links drop constraint if exists player_links_accepted_check;
-- Invites addressed by email before this migration are dropped: nobody could
-- see them under the new rules, and none were ever answered.
delete from public.player_links where invitee_id is null;

drop policy if exists "Linked users read their links" on public.player_links;
create policy "Linked users read their links" on public.player_links
  for select to authenticated using (
    (select auth.uid()) = owner_id or (select auth.uid()) = invitee_id
  );

drop policy if exists "Linked users remove their links" on public.player_links;
create policy "Linked users remove their links" on public.player_links
  for delete to authenticated using (
    (select auth.uid()) = owner_id or (select auth.uid()) = invitee_id
  );

drop function if exists public.invite_player(text, text, text);

-- Invites the account behind a handle ("Jan#4821") as one roster player. A
-- different account for the same player replaces the old link.
create function public.invite_player(p_player_id text, p_player_name text, p_handle text)
returns public.player_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := trim(p_handle);
  v_name text;
  v_tag text;
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
  v_name := trim(split_part(v_handle, '#', 1));
  v_tag := split_part(v_handle, '#', 2);

  select user_id into v_invitee from public.profiles where lower(name) = lower(v_name) and tag = v_tag;
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
  return v_link;
end;
$$;

create or replace function public.accept_player_link(p_link_id uuid)
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
end;
$$;

revoke execute on function public.invite_player(text, text, text) from public, anon;
grant execute on function public.invite_player(text, text, text) to authenticated;
revoke execute on function public.accept_player_link(uuid) from public, anon;
grant execute on function public.accept_player_link(uuid) to authenticated;
