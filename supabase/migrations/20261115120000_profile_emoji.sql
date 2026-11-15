-- A character (emoji) per account. The account picks it on its profile; every
-- linked account shows the player with it, the same way it follows the
-- account's name (src/lib/links/names.ts). Readable under the existing
-- "Linked users read profiles" policy, written only through set_profile_emoji.

alter table public.profiles add column if not exists emoji text;

alter table public.profiles drop constraint if exists profiles_emoji_check;
alter table public.profiles add constraint profiles_emoji_check
  check (emoji is null or (length(emoji) between 1 and 16 and emoji = trim(emoji)));

-- Sets the signed-in user's character; null clears it. Needs a profile (a name) first.
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
  if v_emoji is not null and length(v_emoji) not between 1 and 16 then
    raise exception 'invalid emoji';
  end if;

  update public.profiles
  set emoji = v_emoji, updated_at = now()
  where user_id = v_uid
  returning * into v_profile;
  if not found then
    raise exception 'no profile';
  end if;
  return v_profile;
end;
$$;

revoke execute on function public.set_profile_emoji(text) from public, anon;
grant execute on function public.set_profile_emoji(text) to authenticated;
