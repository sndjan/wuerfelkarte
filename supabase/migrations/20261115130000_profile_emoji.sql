-- Every account picks its own emoji.
--
-- Like the name, it is the account's to choose: everyone who linked the
-- account shows that roster player with it, and follows when it changes.
-- Unlinked roster players keep whatever emoji was picked on the device.
--
-- Run after 20261110130000_player_links.sql.

alter table public.profiles add column if not exists emoji text;

alter table public.profiles drop constraint if exists profiles_emoji_check;
alter table public.profiles add constraint profiles_emoji_check
  check (emoji is null or (length(emoji) between 1 and 8 and emoji !~ '\s'));

-- Sets (or, with null, clears) the signed-in user's emoji. Needs a name first.
create or replace function public.set_profile_emoji(p_emoji text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_emoji text := nullif(trim(p_emoji), '');
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if v_emoji is not null and (length(v_emoji) > 8 or v_emoji ~ '\s') then
    raise exception 'invalid emoji';
  end if;
  update public.profiles set emoji = v_emoji, updated_at = now()
  where user_id = v_uid
  returning * into v_profile;
  if v_profile.user_id is null then
    raise exception 'no profile';
  end if;
  return v_profile;
end;
$$;

revoke execute on function public.set_profile_emoji(text) from public, anon;
grant execute on function public.set_profile_emoji(text) to authenticated;
