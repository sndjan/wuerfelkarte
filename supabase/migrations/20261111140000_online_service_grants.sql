-- The server side of Kniffel Online (/api/online) reads links and profiles
-- and writes the online tables with the project's secret key, i.e. as
-- service_role. Projects where new tables are not exposed to the API
-- automatically give service_role no rights on them, and every request then
-- fails with "permission denied for table player_links". Granting them here
-- makes that independent of the project setting; RLS still keeps the
-- browser to what the earlier migrations allow.
-- Run after 20261111130000_online_games.sql.

grant usage on schema public to service_role;
grant select on table public.player_links to service_role;
grant select on table public.profiles to service_role;
grant select, insert, update, delete on table public.online_games to service_role;
grant select, insert, update, delete on table public.online_game_players to service_role;
grant execute on function public.is_online_participant(uuid) to service_role;
