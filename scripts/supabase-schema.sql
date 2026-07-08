-- TradingTerminal — Supabase schema for user state persistence.
-- Run in the Supabase SQL editor (or `supabase db push`) once per project.
--
-- One row per user holding their workspaces and alerts as JSONB.
-- The UI syncs via ui/src/services/cloudSync.ts (pull on login, debounced push).

create table if not exists public.user_state (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    workspaces jsonb,
    alerts     jsonb,
    updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "select own state" on public.user_state;
create policy "select own state" on public.user_state
    for select using (auth.uid() = user_id);

drop policy if exists "insert own state" on public.user_state;
create policy "insert own state" on public.user_state
    for insert with check (auth.uid() = user_id);

drop policy if exists "update own state" on public.user_state;
create policy "update own state" on public.user_state
    for update using (auth.uid() = user_id);
