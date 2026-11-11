-- Kniffel online: Yatzy games played by linked accounts, each on their own
-- device.
--
-- The browser only reads these tables (RLS: participants only) and listens
-- to them over Realtime. Every write — creating, inviting, rolling, entering —
-- goes through the app's /api/online route, which checks the move with the
-- shared rules engine, rolls the dice itself and writes with the secret key.
-- Run after 20261110130000_player_links.sql.

create table if not exists public.online_games (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'lobby',
  gamemode text not null,
  dice_mode text not null,
  -- Lobby choices, e.g. the Chaoswunder mission settings.
  settings jsonb not null default '{}'::jsonb,
  -- The running game (src/games/online/engine.ts); null in the lobby.
  state jsonb,
  -- Bumped on every write, so two moves at once cannot both land.
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_games_status_check check (status in ('lobby', 'running', 'finished', 'cancelled')),
  constraint online_games_dice_mode_check check (dice_mode in ('digital', 'physical')),
  constraint online_games_gamemode_check check (length(gamemode) between 1 and 32),
  constraint online_games_state_size_check check (pg_column_size(state) <= 100000)
);

create index if not exists online_games_host_idx on public.online_games (host_id);

-- Who is in a game: invited, accepted (playing) or left. A declined or
-- withdrawn invite is deleted.
create table if not exists public.online_game_players (
  game_id uuid not null references public.online_games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The account's name and tag when invited, so others see it without
  -- reading the profile.
  name text not null,
  tag text not null,
  status text not null default 'invited',
  -- In an open lobby or a running game. One game at a time per account.
  active boolean not null default false,
  invited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id),
  constraint online_game_players_status_check check (status in ('invited', 'accepted', 'left'))
);

create index if not exists online_game_players_user_idx on public.online_game_players (user_id, status);
create unique index if not exists online_game_players_one_active on public.online_game_players (user_id) where active;

-- Whether the signed-in user is (or was invited) in a game. Security definer,
-- so the policies below do not query themselves.
create or replace function public.is_online_participant(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.online_game_players
    where game_id = p_game_id and user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_online_participant(uuid) from public, anon;
grant execute on function public.is_online_participant(uuid) to authenticated;

alter table public.online_games enable row level security;
alter table public.online_game_players enable row level security;
revoke all on table public.online_games from anon, authenticated;
revoke all on table public.online_game_players from anon, authenticated;
grant select on table public.online_games to authenticated;
grant select on table public.online_game_players to authenticated;

drop policy if exists "Participants read online games" on public.online_games;
create policy "Participants read online games" on public.online_games
  for select to authenticated using (public.is_online_participant(id));

drop policy if exists "Participants read online players" on public.online_game_players;
create policy "Participants read online players" on public.online_game_players
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_online_participant(game_id)
  );

-- Live updates for the board, the lobby and incoming invites.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'online_games'
    ) then
      alter publication supabase_realtime add table public.online_games;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'online_game_players'
    ) then
      alter publication supabase_realtime add table public.online_game_players;
    end if;
  end if;
end;
$$;
