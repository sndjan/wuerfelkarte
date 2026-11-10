-- Linking a roster player to another account (#accounts).
--
-- Jan has "Tim" in his roster and invites tim@example.com. Once Tim signs in
-- with that address and accepts, every match Jan records with "Tim" in it is
-- copied to Tim's account, so it shows up in his history and statistics too.
-- Nothing tells Jan whether an address has an account: an invite simply waits
-- until someone signs in with it.

create table if not exists public.player_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Shown to the invitee so they know who is asking.
  owner_email text not null,
  -- The roster entry on the owner's devices, and its name when invited.
  player_id text not null,
  player_name text not null,
  invitee_email text not null,
  invitee_id uuid references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint player_links_status_check check (status in ('pending', 'accepted')),
  constraint player_links_accepted_check check ((status = 'accepted') = (invitee_id is not null)),
  constraint player_links_name_check check (length(player_name) between 1 and 60),
  constraint player_links_player_id_check check (length(player_id) between 1 and 64),
  constraint player_links_owner_player_key unique (owner_id, player_id)
);

create index if not exists player_links_invitee_email_idx on public.player_links (invitee_email) where status = 'pending';
create index if not exists player_links_invitee_id_idx on public.player_links (invitee_id);

alter table public.player_links enable row level security;
revoke all on table public.player_links from anon, authenticated;
grant select, delete on table public.player_links to authenticated;

-- Owners see their links, invitees theirs, including invites still addressed
-- to their email. Writes go through the functions below.
drop policy if exists "Linked users read their links" on public.player_links;
create policy "Linked users read their links" on public.player_links
  for select to authenticated using (
    (select auth.uid()) = owner_id
    or (select auth.uid()) = invitee_id
    or (status = 'pending' and invitee_email = lower((select auth.jwt()) ->> 'email'))
  );

-- Either side can end a link; an invitee declines by deleting the invite.
drop policy if exists "Linked users remove their links" on public.player_links;
create policy "Linked users remove their links" on public.player_links
  for delete to authenticated using (
    (select auth.uid()) = owner_id
    or (select auth.uid()) = invitee_id
    or (status = 'pending' and invitee_email = lower((select auth.jwt()) ->> 'email'))
  );

-- Invites (or re-invites) the person behind one roster player. A new address
-- for the same player replaces the old link.
create or replace function public.invite_player(p_player_id text, p_player_name text, p_email text)
returns public.player_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_own_email text := lower(auth.jwt() ->> 'email');
  v_email text := lower(trim(p_email));
  v_link public.player_links;
begin
  if v_uid is null or v_own_email is null then
    raise exception 'not signed in';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'invalid email';
  end if;
  if v_email = v_own_email then
    raise exception 'own email';
  end if;
  if (select count(*) from public.player_links where owner_id = v_uid and player_id <> p_player_id) >= 50 then
    raise exception 'too many links';
  end if;

  insert into public.player_links (owner_id, owner_email, player_id, player_name, invitee_email)
  values (v_uid, v_own_email, p_player_id, trim(p_player_name), v_email)
  on conflict on constraint player_links_owner_player_key do update
    set player_name = excluded.player_name,
        owner_email = excluded.owner_email,
        -- Same address: keep an accepted link. New address: start over.
        invitee_email = excluded.invitee_email,
        invitee_id = case when public.player_links.invitee_email = excluded.invitee_email
                          then public.player_links.invitee_id end,
        status = case when public.player_links.invitee_email = excluded.invitee_email
                      then public.player_links.status else 'pending' end,
        accepted_at = case when public.player_links.invitee_email = excluded.invitee_email
                           then public.player_links.accepted_at end
  returning * into v_link;
  return v_link;
end;
$$;

-- Accepts an invite addressed to the signed-in user's email.
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
  set invitee_id = auth.uid(), status = 'accepted', accepted_at = now()
  where id = p_link_id
    and status = 'pending'
    and invitee_email = lower(auth.jwt() ->> 'email')
    and owner_id <> auth.uid();
  if not found then
    raise exception 'invite not found';
  end if;
end;
$$;

revoke execute on function public.invite_player(text, text, text) from public, anon;
revoke execute on function public.accept_player_link(uuid) from public, anon;
grant execute on function public.invite_player(text, text, text) to authenticated;
grant execute on function public.accept_player_link(uuid) to authenticated;

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
  if old.invitee_id is not null and not exists (
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
