-- Hey Next — initial schema + Row-Level Security
-- Paste this into Supabase SQL editor (or run via supabase CLI)
--
-- Privacy model:
--   profiles       -- public-ish data (handle, display name, status, etc.)
--   private_contacts -- phone + email; RLS hides these unless friendship exists AND owner is 'available'
--   friendships    -- bidirectional with canonical ordering (user_a < user_b)
--   reveal_events  -- in-app notifications when someone flips available
--   sent_messages  -- outbound SMS queue + delivery status
--
-- Order matters: tables that other tables' RLS policies reference must be
-- created first. Specifically, friendships is created before private_contacts
-- because private_contacts' SELECT policy joins against friendships.

-- ============================================================
-- PROFILES (public-ish: handle, display name, status, gender, bio)
-- ============================================================

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  handle          text unique not null check (handle = lower(handle) and handle ~ '^[a-z0-9_]{2,30}$'),
  display_name    text not null check (char_length(display_name) between 1 and 60),
  bio             text not null default '' check (char_length(bio) <= 280),
  avatar_hue      int  not null check (avatar_hue between 0 and 359),
  gender          text not null check (gender in ('her', 'him', 'they')),
  status          text not null default 'unavailable' check (status in ('available', 'unavailable')),
  status_note     text not null default '' check (char_length(status_note) <= 80),
  status_changed_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index profiles_handle_idx on public.profiles (handle);
create index profiles_status_idx on public.profiles (status) where status = 'available';

alter table public.profiles enable row level security;

create policy "profiles_read_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- FRIENDSHIPS (created early so other tables' policies can reference it)
-- ============================================================

create table public.friendships (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles (id) on delete cascade,
  user_b     uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index friendships_user_a_idx on public.friendships (user_a);
create index friendships_user_b_idx on public.friendships (user_b);

alter table public.friendships enable row level security;

create policy "friendships_read_own"
  on public.friendships for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

create policy "friendships_insert_own"
  on public.friendships for insert
  to authenticated
  with check (user_a = auth.uid() or user_b = auth.uid());

create policy "friendships_delete_own"
  on public.friendships for delete
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

create or replace function public.normalize_friendship_pair()
returns trigger
language plpgsql
as $$
declare
  tmp uuid;
begin
  if new.user_a = new.user_b then
    raise exception 'Cannot friend yourself';
  end if;
  if new.user_a > new.user_b then
    tmp := new.user_a;
    new.user_a := new.user_b;
    new.user_b := tmp;
  end if;
  return new;
end;
$$;

create trigger normalize_friendship_pair_trig
  before insert or update on public.friendships
  for each row execute function public.normalize_friendship_pair();

-- ============================================================
-- PRIVATE_CONTACTS (phone + email; the sensitive stuff)
-- Now safe to create — friendships exists for the SELECT policy.
-- ============================================================

create table public.private_contacts (
  user_id  uuid primary key references public.profiles (id) on delete cascade,
  phone    text not null,
  email    text not null default ''
);

alter table public.private_contacts enable row level security;

-- You can always read your own contact info
-- You can read a friend's contact info ONLY if their status = 'available'
create policy "private_contacts_read_friend_when_available"
  on public.private_contacts for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.friendships f
      join public.profiles p on p.id = private_contacts.user_id
      where p.status = 'available'
        and (
          (f.user_a = auth.uid() and f.user_b = private_contacts.user_id)
          or
          (f.user_b = auth.uid() and f.user_a = private_contacts.user_id)
        )
    )
  );

create policy "private_contacts_insert_own"
  on public.private_contacts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "private_contacts_update_own"
  on public.private_contacts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- REVEAL_EVENTS (in-app notification when a friend goes available)
-- ============================================================

create table public.reveal_events (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id   uuid not null references public.profiles (id) on delete cascade,
  new_status   text not null check (new_status in ('available', 'unavailable')),
  note         text not null default '',
  created_at   timestamptz not null default now(),
  seen         boolean not null default false
);

create index reveal_events_to_user_unseen_idx
  on public.reveal_events (to_user_id, created_at desc)
  where not seen;

alter table public.reveal_events enable row level security;

create policy "reveal_events_read_own"
  on public.reveal_events for select
  to authenticated
  using (to_user_id = auth.uid() or from_user_id = auth.uid());

create policy "reveal_events_insert_own"
  on public.reveal_events for insert
  to authenticated
  with check (from_user_id = auth.uid());

create policy "reveal_events_update_own"
  on public.reveal_events for update
  to authenticated
  using (to_user_id = auth.uid())
  with check (to_user_id = auth.uid());

-- ============================================================
-- SENT_MESSAGES (outbound SMS queue + delivery status)
-- ============================================================

create table public.sent_messages (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id   uuid not null references public.profiles (id) on delete cascade,
  to_phone     text not null,
  body         text not null,
  status       text not null default 'queued' check (status in ('queued', 'sent-real', 'sent-demo', 'failed')),
  error        text,
  created_at   timestamptz not null default now()
);

create index sent_messages_from_user_idx on public.sent_messages (from_user_id, created_at desc);

alter table public.sent_messages enable row level security;

create policy "sent_messages_read_own"
  on public.sent_messages for select
  to authenticated
  using (from_user_id = auth.uid());

create policy "sent_messages_insert_own"
  on public.sent_messages for insert
  to authenticated
  with check (from_user_id = auth.uid());

-- ============================================================
-- REALTIME (Phase 3 will subscribe to these)
-- ============================================================

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.reveal_events;
