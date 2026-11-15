-- Every online player carries an emoji, guests included.
--
-- Accounts bring their profile's emoji (20261115130000_profile_emoji.sql);
-- a guest picks one on the invite page, or gets a random one. The server
-- (src/games/online/server.ts) writes it with the player row and copies it
-- into the seat when the game starts. Before this runs, the server writes
-- rows without it and nobody has an emoji online.
--
-- Run after 20261111130000_online_games.sql.

alter table public.online_game_players add column if not exists emoji text;

alter table public.online_game_players drop constraint if exists online_game_players_emoji_check;
alter table public.online_game_players add constraint online_game_players_emoji_check
  check (emoji is null or (length(emoji) between 1 and 8 and emoji !~ '\s'));
