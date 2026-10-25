-- DraftIt: database, file storage and security rules for Supabase.
-- Run once in your Supabase project: SQL Editor > New query > paste this whole file > Run.
-- It is safe to run again: it only creates what is missing and refreshes the rules.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- Every row belongs to one signed-in account (owner). Row-level security below
-- means an account can only ever see or change its own rows.
-- ---------------------------------------------------------------------------

-- Profile and settings for each account.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per deal: parties, terms, flags, draft agreement, chat, dates.
create table if not exists public.deals (
  owner      uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  title      text,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);

-- Evidence: chats, voice notes, PDFs, photos and snips. Kept exactly as uploaded:
-- there is no update rule, so the database itself refuses any edit.
create table if not exists public.evidence (
  owner       uuid not null references auth.users (id) on delete cascade,
  id          text not null,
  deal_id     text not null,
  type        text not null,
  name        text,
  sha256      text not null,
  raw_text    text,
  messages    jsonb not null default '[]'::jsonb,
  media       jsonb,
  data        jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (owner, deal_id, id),
  foreign key (owner, deal_id) references public.deals (owner, id) on delete cascade
);

-- Locked versions of an agreement, each sealed with a SHA-256 hash chained to the one before.
create table if not exists public.versions (
  owner      uuid not null references auth.users (id) on delete cascade,
  deal_id    text not null,
  rev        integer not null,
  hash       text not null,
  prev_hash  text,
  frozen_at  timestamptz,
  payload    jsonb not null,
  lawyer     jsonb,
  data       jsonb not null default '{}'::jsonb,
  primary key (owner, deal_id, rev),
  foreign key (owner, deal_id) references public.deals (owner, id) on delete cascade
);

-- Signatures on a locked version. Insert only: a signature can never be edited.
create table if not exists public.signatures (
  owner     uuid not null references auth.users (id) on delete cascade,
  deal_id   text not null,
  rev       integer not null,
  party     text not null,
  data      jsonb not null,
  signed_at timestamptz,
  primary key (owner, deal_id, rev, party),
  foreign key (owner, deal_id, rev) references public.versions (owner, deal_id, rev) on delete cascade
);

-- Older single-record storage, kept so existing accounts move over automatically.
create table if not exists public.workspaces (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists evidence_deal_idx   on public.evidence   (owner, deal_id);
create index if not exists versions_deal_idx   on public.versions   (owner, deal_id);
create index if not exists signatures_ver_idx  on public.signatures (owner, deal_id, rev);

-- Value checks enforced by the database itself, so bad data is refused even if someone
-- bypasses the app and calls the API directly. "not valid" means old rows are left alone,
-- while every new or changed row must pass.
do $$
declare c record;
begin
  for c in select * from (values
    ('deals','deals_id_ok',        $c$id ~ '^[A-Za-z0-9_-]{1,40}$'$c$),
    ('deals','deals_title_len',    $c$title is null or char_length(title) <= 200$c$),
    ('deals','deals_data_size',    $c$octet_length(data::text) <= 5000000$c$),
    ('profiles','profiles_size',   $c$octet_length(data::text) <= 2000000$c$),
    ('evidence','evidence_id_ok',  $c$id ~ '^CR-[0-9]{1,9}$'$c$),
    ('evidence','evidence_type_ok',$c$type in ('paste','whatsapp','voice','pdf','photo','snip','room')$c$),
    ('evidence','evidence_hash_ok',$c$sha256 ~ '^[0-9a-f]{64}$'$c$),
    ('evidence','evidence_name_len',$c$name is null or char_length(name) <= 255$c$),
    ('evidence','evidence_text_len',$c$raw_text is null or char_length(raw_text) <= 1000000$c$),
    ('versions','versions_rev_ok', $c$rev between 1 and 10000$c$),
    ('versions','versions_hash_ok',$c$hash ~ '^[0-9a-f]{64}$' and (prev_hash is null or prev_hash ~ '^[0-9a-f]{64}$')$c$),
    ('signatures','signatures_party_ok',$c$party in ('me','cp') and rev between 1 and 10000$c$)
  ) as v(tbl, name, expr) loop
    execute format('alter table public.%I drop constraint if exists %I', c.tbl, c.name);
    execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
  end loop;
end $$;

-- A locked version's hash and contents can never change; only the lawyer review may be added.
create or replace function public.versions_keep_seal()
returns trigger language plpgsql as $$
begin
  if new.hash is distinct from old.hash or new.payload is distinct from old.payload
     or new.prev_hash is distinct from old.prev_hash or new.rev is distinct from old.rev then
    raise exception 'A locked version cannot be changed';
  end if;
  return new;
end $$;
drop trigger if exists versions_keep_seal on public.versions;
create trigger versions_keep_seal before update on public.versions
  for each row execute function public.versions_keep_seal();

-- ---------------------------------------------------------------------------
-- 2. Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.deals      enable row level security;
alter table public.evidence   enable row level security;
alter table public.versions   enable row level security;
alter table public.signatures enable row level security;
alter table public.workspaces enable row level security;

do $$
declare t text; p record;
begin
  foreach t in array array['profiles','deals','evidence','versions','signatures','workspaces'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

create policy "profiles: own" on public.profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "deals: own" on public.deals for all to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

create policy "evidence: read own"   on public.evidence for select to authenticated using (auth.uid() = owner);
create policy "evidence: add own"    on public.evidence for insert to authenticated with check (auth.uid() = owner);
create policy "evidence: delete own" on public.evidence for delete to authenticated using (auth.uid() = owner);
-- (no update policy: evidence cannot be edited)

create policy "versions: read own"   on public.versions for select to authenticated using (auth.uid() = owner);
create policy "versions: add own"    on public.versions for insert to authenticated with check (auth.uid() = owner);
create policy "versions: review own" on public.versions for update to authenticated using (auth.uid() = owner) with check (auth.uid() = owner);
-- (no delete policy: a locked version stays; it goes only when its deal or account is deleted)

create policy "signatures: read own" on public.signatures for select to authenticated using (auth.uid() = owner);
create policy "signatures: add own"  on public.signatures for insert to authenticated with check (auth.uid() = owner);
-- (no update or delete policy: signatures are permanent)

create policy "workspaces: own" on public.workspaces for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. File storage for original files (voice notes, snips, photos, PDFs, chat exports)
-- Private bucket. Each account's files live under a folder named after its user id,
-- and can only be read, added or deleted by that account. Files cannot be overwritten.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "evidence files: read own"   on storage.objects;
drop policy if exists "evidence files: add own"    on storage.objects;
drop policy if exists "evidence files: delete own" on storage.objects;

create policy "evidence files: read own" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence files: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence files: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 4. "Delete my account and data" in the app calls this. The app first deletes the
-- account's files; this then removes the login, and every table row goes with it.
-- ---------------------------------------------------------------------------
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
