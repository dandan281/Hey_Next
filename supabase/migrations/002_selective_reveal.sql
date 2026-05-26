-- Hey Next — selective reveal
--
-- Adds an optional per-flip friend allowlist. Empty array preserves the
-- previous "all friends" behavior; a populated array narrows contact
-- visibility (and reveal SMS / popup) to exactly those friend IDs.

alter table public.profiles
  add column revealed_to_user_ids uuid[] not null default '{}';

-- Replace the contact-visibility policy to honor the allowlist.
drop policy "private_contacts_read_friend_when_available" on public.private_contacts;

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
        and (
          cardinality(p.revealed_to_user_ids) = 0
          or auth.uid() = any(p.revealed_to_user_ids)
        )
    )
  );
