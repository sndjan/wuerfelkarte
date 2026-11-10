-- Optional accounts: the browser's game data, synced across a user's devices.
--
-- The app keeps localStorage as its only storage; this table holds a copy of
-- each synced key (roster, match histories, running games, settings) as one
-- row per user and key. Sign-in is Supabase Auth's email link/code, so the
-- only personal data is the email address in auth.users.

create table if not exists public.user_storage (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  -- null marks a key the app removed, so other devices remove it too.
  value jsonb,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, key),
  constraint user_storage_key_check check (key ~ '^[a-z0-9]+:[a-z]+$' and length(key) <= 64),
  -- A long match history is a few hundred kilobytes; this is far above it.
  constraint user_storage_value_size_check check (pg_column_size(value) <= 4000000)
);

-- Downloads ask for everything changed since the last one.
create index if not exists user_storage_user_updated_idx
  on public.user_storage (user_id, updated_at);

alter table public.user_storage enable row level security;

drop policy if exists "Users read their own storage" on public.user_storage;
create policy "Users read their own storage" on public.user_storage
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own storage" on public.user_storage;
create policy "Users add their own storage" on public.user_storage
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users change their own storage" on public.user_storage;
create policy "Users change their own storage" on public.user_storage
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.user_storage from anon;
revoke all on table public.user_storage from authenticated;
grant select, insert, update on table public.user_storage to authenticated;

-- The server stamps every write, so devices never compare their own clocks.
-- clock_timestamp() rather than now(): two writes in one transaction still differ.
create or replace function public.user_storage_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

-- Only one key per synced item exists, but nothing else stops a client from
-- inventing keys; this keeps a single account from filling the database.
create or replace function public.user_storage_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An upsert of an existing key also runs insert triggers before it turns
  -- into an update, so that one must not count against the limit.
  if not exists (select 1 from public.user_storage where user_id = new.user_id and key = new.key)
    and (select count(*) from public.user_storage where user_id = new.user_id) >= 200 then
    raise exception 'too many keys';
  end if;
  return new;
end;
$$;

revoke execute on function public.user_storage_stamp() from public;
revoke execute on function public.user_storage_limit() from public, anon, authenticated;

drop trigger if exists user_storage_stamp on public.user_storage;
create trigger user_storage_stamp
  before insert or update on public.user_storage
  for each row execute function public.user_storage_stamp();

drop trigger if exists user_storage_limit on public.user_storage;
create trigger user_storage_limit
  before insert on public.user_storage
  for each row execute function public.user_storage_limit();

-- Deletes the signed-in user. Everything of theirs hangs off auth.users with
-- on delete cascade, so this one row is the whole account.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
