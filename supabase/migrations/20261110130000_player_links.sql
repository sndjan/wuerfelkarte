-- Account names, and linking roster players to other accounts by them.
--
-- Every account picks a name and gets a four-digit tag, so "Jan#4821" is
-- unique even when many people are called Jan. Jan links his roster entry
-- "Timmi" to "Tim#0193"; once Tim accepts, Jan's devices show the player
-- under Tim's account name everywhere (and follow it when it changes), and
-- every match Jan records with him is copied to Tim's account, so it shows up
-- in his history and statistics too.

-- Links ---------------------------------------------------------------------

create table if not exists public.player_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- The roster entry on the owner's devices, and its name when invited.
  player_id text not null,
  player_name text not null,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint player_links_status_check check (status in ('pending', 'accepted')),
  constraint player_links_name_check check (length(player_name) between 1 and 60),
  constraint player_links_player_id_check check (length(player_id) between 1 and 64),
  constraint player_links_not_self_check check (owner_id <> invitee_id),
  constraint player_links_owner_player_key unique (owner_id, player_id)
);

create index if not exists player_links_invitee_idx on public.player_links (invitee_id);

alter table public.player_links enable row level security;
revoke all on table public.player_links from anon, authenticated;
grant select, delete on table public.player_links to authenticated;

-- Both sides see a link; writes other than deleting go through the functions below.
drop policy if exists "Linked users read their links" on public.player_links;
create policy "Linked users read their links" on public.player_links
  for select to authenticated using (
    (select auth.uid()) = owner_id or (select auth.uid()) = invitee_id
  );

-- Either side can end a link; an invitee declines by deleting the invite.
drop policy if exists "Linked users remove their links" on public.player_links;
create policy "Linked users remove their links" on public.player_links
  for delete to authenticated using (
    (select auth.uid()) = owner_id or (select auth.uid()) = invitee_id
  );

-- Profiles ------------------------------------------------------------------

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
-- invites included). Looking someone up by ID goes through invite_player.
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
      v_tag := (1000 + floor(random() * 9000))::int::text;
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

-- Invites the account behind a Konto-ID ("Tim#0193") as one roster player.
-- Another account for the same player replaces the old link.
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

revoke execute on function public.set_profile_name(text) from public, anon;
revoke execute on function public.invite_player(text, text, text) from public, anon;
revoke execute on function public.accept_player_link(uuid) from public, anon;
grant execute on function public.set_profile_name(text) to authenticated;
grant execute on function public.invite_player(text, text, text) to authenticated;
grant execute on function public.accept_player_link(uuid) to authenticated;

-- Shared matches --------------------------------------------------------------

-- Matches the owner recorded with a linked player, copied for that player.
create table if not exists public.shared_matches (
  owner_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  game text not null,
  match_id text not null,
  match jsonb not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (owner_id, recipient_id, game, match_id),
  constraint shared_matches_game_check check (game ~ '^[a-z0-9]+$' and length(game) <= 32),
  constraint shared_matches_match_id_check check (length(match_id) <= 64),
  constraint shared_matches_size_check check (pg_column_size(match) <= 200000)
);

create index if not exists shared_matches_recipient_idx on public.shared_matches (recipient_id, updated_at);

alter table public.shared_matches enable row level security;
revoke all on table public.shared_matches from anon, authenticated;
grant select, insert, update on table public.shared_matches to authenticated;

drop policy if exists "Owners and recipients read shared matches" on public.shared_matches;
create policy "Owners and recipients read shared matches" on public.shared_matches
  for select to authenticated using (
    (select auth.uid()) = owner_id or (select auth.uid()) = recipient_id
  );

-- Only for someone who accepted a link from the owner.
drop policy if exists "Owners share with linked players" on public.shared_matches;
create policy "Owners share with linked players" on public.shared_matches
  for insert to authenticated with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.player_links l
      where l.owner_id = shared_matches.owner_id
        and l.invitee_id = shared_matches.recipient_id
        and l.status = 'accepted'
    )
  );

drop policy if exists "Owners update shared matches" on public.shared_matches;
create policy "Owners update shared matches" on public.shared_matches
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.player_links l
      where l.owner_id = shared_matches.owner_id
        and l.invitee_id = shared_matches.recipient_id
        and l.status = 'accepted'
    )
  );

-- Reuses the stamp function from 20261110120000_user_storage.sql.
drop trigger if exists shared_matches_stamp on public.shared_matches;
create trigger shared_matches_stamp
  before insert or update on public.shared_matches
  for each row execute function public.user_storage_stamp();

-- Ending a link stops the sharing; matches already copied stay with the
-- recipient, as they would on a sheet of paper.
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
  return old;
end;
$$;

revoke execute on function public.player_links_cleanup() from public, anon, authenticated;

drop trigger if exists player_links_cleanup on public.player_links;
create trigger player_links_cleanup
  after delete on public.player_links
  for each row execute function public.player_links_cleanup();
