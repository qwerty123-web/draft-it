-- Draft It: online storage for Supabase.
-- Run once in your Supabase project: SQL Editor > New query > paste this file > Run.

-- One private workspace per account: profile, deals, signatures and settings.
create table if not exists public.workspaces (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

drop policy if exists "read own workspace"   on public.workspaces;
drop policy if exists "create own workspace" on public.workspaces;
drop policy if exists "update own workspace" on public.workspaces;
drop policy if exists "delete own workspace" on public.workspaces;

create policy "read own workspace"   on public.workspaces for select to authenticated using (auth.uid() = user_id);
create policy "create own workspace" on public.workspaces for insert to authenticated with check (auth.uid() = user_id);
create policy "update own workspace" on public.workspaces for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own workspace" on public.workspaces for delete to authenticated using (auth.uid() = user_id);

-- "Delete my account and data" in the app calls this. It removes the login and, through the
-- foreign key, the workspace. It can only ever delete the account that is signed in.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
