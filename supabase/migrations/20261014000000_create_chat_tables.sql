-- ==============================================================================
-- SUPABASE MIGRATION: 20261014000000_create_chat_tables.sql
-- Project: Aura AI Chatbot
-- Creates conversations and messages tables, indexes, and RLS security policies
-- ==============================================================================

-- 1. Create Conversations Table
create table if not exists public.conversations (
  id text primary key,
  title text not null default 'New Conversation',
  persona text not null default 'nexus',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Messages Table with Foreign Key Cascade
create table if not exists public.messages (
  id text primary key,
  conversation_id text references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  duration_ms integer default 0,
  tokens integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Performance Indexes
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);

-- 4. Enable Row Level Security (RLS)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- 5. Create Permissive Policies for Anon/Public Client Access
drop policy if exists "Allow all operations for anon on conversations" on public.conversations;
create policy "Allow all operations for anon on conversations"
  on public.conversations
  for all
  using (true)
  with check (true);

drop policy if exists "Allow all operations for anon on messages" on public.messages;
create policy "Allow all operations for anon on messages"
  on public.messages
  for all
  using (true)
  with check (true);

-- 6. Grant Permissions to Database Roles
grant all on public.conversations to anon, authenticated, service_role;
grant all on public.messages to anon, authenticated, service_role;

-- 7. Add Tables to Realtime Replication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversations;
    alter publication supabase_realtime add table public.messages;
  end if;
exception
  when duplicate_object then null;
end $$;
