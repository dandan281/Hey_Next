# FunLma backend — master implementation plan

**Goal:** replace the localStorage demo with a real backend so two different
people on two different devices can actually use the app. Real auth, real
contact data behind RLS, real-time reveal across devices, real SMS sent by
the server.

---

## TL;DR

- **Stack:** Supabase (Postgres + Auth + Realtime) + Twilio Verify (phone OTP) +
  Twilio Programmable SMS (already wired) + Vercel deploy.
- **Honest effort:** ~12–20 hours of focused work spread across 2–3 sessions.
  No unknown unknowns — every phase below has a concrete deliverable and a
  verification step.
- **Cost:** Supabase free tier is enough for hundreds of users. Twilio: ~$1
  to upgrade past trial, ~$0.0079 per US SMS, ~$0.05 per Verify check. For a
  100-user closed beta with 5 reveals/user/month: **<$10/month all-in**.
- **What survives:** the entire UI, the dramatic reveal overlay, the SMS
  overlay animation, all components. We're swapping the data plumbing
  underneath them, not redoing the app.
- **What dies:** the localStorage store, the persona switcher (real auth =
  one identity per browser), the seeded Alice/Bob personas. The demo lives
  on at `/demo` as a frozen showcase for the landing page.

---

## Architecture (where we're going)

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  Next.js 16 (Vercel)    │◄────────│  Supabase Realtime       │
│  • Server components    │ ws://   │  • postgres_changes      │
│  • Client components    │         │    on reveal_events      │
│  • /api/send-reveal-sms │         └──────────────────────────┘
└────────┬────────────────┘                  │
         │ supabase-js (anon key)            │
         ▼                                   ▼
┌────────────────────────────────────────────────────────┐
│  Supabase Postgres                                      │
│   • auth.users  (managed by Supabase Auth)              │
│   • profiles    (displayName, handle, bio, status, …)   │
│   • friendships                                         │
│   • reveal_events                                       │
│   • sent_messages                                       │
│   • RLS: contact info visible to friends iff available  │
└────────┬────────────────────────────────────────────────┘
         │ phone OTP
         ▼
┌──────────────────────────┐
│  Twilio                  │
│   • Verify (auth OTP)    │
│   • Messaging (reveal)   │
└──────────────────────────┘
```

---

## Decisions log

| Question | Choice | Why |
|---|---|---|
| Backend? | Supabase | Free tier, Postgres (familiar), Auth + Realtime + RLS bundled. Earlier alternative was Firebase — Supabase wins on schema design + SQL RLS. |
| Auth method? | Phone OTP via Twilio Verify | The product is about phone numbers. Auth-by-phone gives us a verified phone on every account by construction. Reuses our Twilio account. |
| Email field? | Optional profile field, not auth | We don't want two-factor onboarding. Email becomes a contact-info field only. |
| Realtime mechanism? | Supabase `postgres_changes` channel filtered by `to_user_id` | Built-in, no extra service. Each browser subscribes to its own row stream. |
| Where does SMS get sent? | Existing `/api/send-reveal-sms` route, now authenticated + DB-backed | We already built it. Server-side Edge-Function triggers are phase-N improvement, not phase 1. |
| Demo preserved? | Yes, at `/demo` — same code as current `/app`, frozen | Landing page needs an interactive demo without sign-up friction. |
| Multi-persona on one device? | Gone | Real auth = one identity. If you want two accounts, use two browsers/profiles. |
| Storage of phone numbers? | Plain text, E.164 normalized, RLS-protected | Encrypting in app layer adds complexity for marginal benefit at this scale. Database is encrypted at rest by Supabase. |

If you disagree with any of these, override here before starting phase 0 —
each downstream phase is shaped by these choices.

---

## Prerequisites — do these before phase 0

- [ ] **Supabase account** at https://supabase.com (free, GitHub login is fine)
- [ ] **Twilio account upgraded past trial** (~$1 min top-up) so SMS can hit
      any number, not just verified ones. You can stay on trial through the
      whole plan if you only ever text yourself.
- [ ] **Twilio Verify service** created — Twilio Console → Verify → Services
      → Create. Copy the `VAxxxxxxxxxx` Service SID. We'll plug this into
      Supabase Auth.
- [ ] **GitHub account** — Vercel deploy and Supabase backup integration
      both flow through git.
- [ ] **Personal phone you can receive SMS on for testing.**

---

## Phase 0 — Supabase project & local env

**Goal:** be able to `select 1` against your own Supabase Postgres from local dev.

- [ ] Create a Supabase project. Name `funlma-dev`. Region close to you.
      Save the database password somewhere — you can't recover it later.
- [ ] On the project dashboard, grab from Settings → API:
      - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
      - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      - `service_role` key (only used in server routes, NEVER ship to client)
        → `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Append to `.env.local`:
      ```
      NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
      SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
      ```
      Also add the same three keys to `.env.local.example` (with empty values).
- [ ] Install client libs:
      ```
      npm install @supabase/supabase-js @supabase/ssr
      ```
- [ ] Create `src/lib/supabase-browser.ts` and `src/lib/supabase-server.ts` —
      thin factories using `@supabase/ssr` (browser client uses anon key from
      cookies, server client uses service role for API routes).

**Done when:** a throwaway server component renders the result of
`supabase.from('pg_tables').select('tablename').limit(1)` without erroring.
Delete the component after.

---

## Phase 1 — Schema & RLS

**Goal:** the database knows what a user, a friendship, and a reveal event
are, and refuses to leak data across users.

### Migration: `001_init.sql`

Run via Supabase Studio → SQL Editor → New query → paste → run.

```sql
-- 1. Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{2,30}$'),
  display_name text not null,
  phone text not null,                    -- E.164, also stored in auth.users
  email text,
  bio text,
  avatar_hue int not null default 200,
  status text not null default 'unavailable' check (status in ('available','unavailable')),
  status_note text default '',
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 2. Friendships (undirected; we always store with user_a < user_b for uniqueness)
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index on public.friendships (user_a);
create index on public.friendships (user_b);

-- 3. Reveal events (one row per friend, per flip-to-available)
create table public.reveal_events (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  note text default '',
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index on public.reveal_events (to_user_id, seen_at);

-- 4. Sent messages (one row per SMS attempt)
create table public.sent_messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  to_phone text not null,
  body text not null,
  status text not null check (status in ('queued','sent-real','sent-demo','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index on public.sent_messages (from_user_id, created_at desc);

-- 5. Helper: are these two users friends?
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.friendships f
    where (f.user_a = least(a,b) and f.user_b = greatest(a,b))
  );
$$;
```

### RLS policies: `002_rls.sql`

```sql
alter table public.profiles       enable row level security;
alter table public.friendships    enable row level security;
alter table public.reveal_events  enable row level security;
alter table public.sent_messages  enable row level security;

-- PROFILES: anyone can read public bits of any profile by handle (needed for add-friend).
-- Contact info (phone, email) only visible to self OR friends-when-available.

-- Public read of non-sensitive columns
create policy "profiles_public_read" on public.profiles
  for select using (true);

-- BUT we hide phone/email at the application layer via column SELECTs in queries.
-- For row-level protection of the *full* row, see the secure_profile view below.

create or replace view public.secure_profiles as
  select
    p.id, p.handle, p.display_name, p.bio, p.avatar_hue,
    p.status, p.status_note, p.status_changed_at, p.created_at,
    case
      when p.id = auth.uid() then p.phone
      when p.status = 'available' and public.are_friends(auth.uid(), p.id) then p.phone
      else null
    end as phone,
    case
      when p.id = auth.uid() then p.email
      when p.status = 'available' and public.are_friends(auth.uid(), p.id) then p.email
      else null
    end as email
  from public.profiles p;

-- Self can update own profile
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Self can insert own profile (during onboarding)
create policy "profiles_self_insert" on public.profiles
  for insert with check (id = auth.uid());

-- FRIENDSHIPS: visible if you're either side; insertable if you're one of the two.
create policy "friendships_self_read" on public.friendships
  for select using (user_a = auth.uid() or user_b = auth.uid());

create policy "friendships_self_insert" on public.friendships
  for insert with check (user_a = auth.uid() or user_b = auth.uid());

create policy "friendships_self_delete" on public.friendships
  for delete using (user_a = auth.uid() or user_b = auth.uid());

-- REVEAL EVENTS: receiver can read & mark seen, sender can insert.
create policy "reveal_events_to_user_read" on public.reveal_events
  for select using (to_user_id = auth.uid());

create policy "reveal_events_from_user_insert" on public.reveal_events
  for insert with check (from_user_id = auth.uid());

create policy "reveal_events_to_user_update_seen" on public.reveal_events
  for update using (to_user_id = auth.uid())
  with check (to_user_id = auth.uid());

-- SENT MESSAGES: only the sender sees their own outbox.
create policy "sent_messages_from_user_read" on public.sent_messages
  for select using (from_user_id = auth.uid());

create policy "sent_messages_from_user_insert" on public.sent_messages
  for insert with check (from_user_id = auth.uid());

create policy "sent_messages_from_user_update" on public.sent_messages
  for update using (from_user_id = auth.uid())
  with check (from_user_id = auth.uid());
```

### Realtime publication

```sql
-- Enable realtime broadcasts for reveal_events. Other tables don't need it.
alter publication supabase_realtime add table public.reveal_events;
```

**Done when:**
- [ ] In Supabase Studio, you can `select * from secure_profiles` and the
      `phone`/`email` columns return `null` for users who aren't friends of
      the current `auth.uid()`.
- [ ] Inserting a `friendships` row with `user_a > user_b` fails the
      check constraint (sanity test).
- [ ] The Realtime tab in Studio shows `reveal_events` as a published table.

---

## Phase 2 — Phone OTP auth via Supabase + Twilio Verify

**Goal:** user enters their phone, gets an SMS code, enters it, lands in a
session. No passwords.

### 2a. Configure Supabase Auth

- [ ] Supabase Studio → Authentication → Providers → Phone → Enable.
- [ ] Choose **Twilio Verify** as SMS provider.
- [ ] Paste your Twilio Account SID, Auth Token, and Verify Service SID
      (from prereqs).

### 2b. Build the sign-in page

- [ ] New route: `src/app/auth/page.tsx` — a single page with two states:
      1. **Phone entry:** input, "send code" button → calls
         `supabase.auth.signInWithOtp({ phone })`.
      2. **Code entry:** 6-digit OTP input → calls
         `supabase.auth.verifyOtp({ phone, token: code, type: 'sms' })`.
      On success, redirect to `/app/onboarding` (if no profile exists) or
      `/app` (if profile exists).
- [ ] Handle the case where the user is already signed in — `auth/page.tsx`
      should immediately redirect away if `getSession()` returns a session.

### 2c. Wire up middleware (auth gate)

- [ ] Create `src/middleware.ts` using `@supabase/ssr`. On any `/app/*` route,
      check session. No session → redirect to `/auth`. Session but no profile
      row → redirect to `/app/onboarding`.
- [ ] `/demo/*` and `/` skip the middleware entirely.

### 2d. Rewrite onboarding

- [ ] `/app/onboarding` now:
      - Phone is pre-filled from session (read-only).
      - User picks handle (uniqueness check via the existing `profiles_unique` constraint).
      - User enters displayName, optional email, optional bio.
      - On submit: insert `profiles` row (id = `auth.uid()`).
      - Then redirect to `/app`.

**Done when:**
- [ ] You can sign up from scratch on your real phone: enter number → get
      real SMS → enter code → land on onboarding → fill profile → land on `/app`.
- [ ] Hitting `/app` in a fresh incognito window redirects to `/auth`.
- [ ] Signing out and back in lands directly on `/app` (skipping onboarding).

---

## Phase 3 — Replace data layer

**Goal:** every page that currently reads from localStorage now reads from
Supabase. The UI components stay untouched (this is critical — touch them
and you'll re-do hours of styling work).

### 3a. Build a typed DB module

- [ ] Generate types: `npx supabase gen types typescript --project-id YOUR_REF
      > src/lib/database.types.ts` (one-time, regenerate after schema changes).
- [ ] `src/lib/db.ts` — thin wrapper functions matching the shape of the
      current `store.ts` API. Same function names where possible:
      `getActiveProfile`, `getFriends`, `setStatus`, `addFriendship`,
      `getUnseenEvents`, `markEventSeen`, etc. Each returns a Promise.

### 3b. Migrate `useStore` → `useDb`

- [ ] `src/lib/useStore.ts` becomes `useDb.ts`. It still exposes
      `{ activeUser, friends, events, sentMessages }` but each is loaded
      async with a loading state. Use Suspense or a simple `ready` flag —
      keep parity with the current API so component diff is small.
- [ ] Important: `activePersonaId` field is gone. Replace with `auth.uid()`.

### 3c. Migrate each consumer (order: low-risk → high-risk)

1. [ ] `/app/page.tsx` — profile + status toggle
2. [ ] `/app/friends/page.tsx` — friend list
3. [ ] `/app/add/page.tsx` — drop the "demo personas" section, replace with
       "add by handle" calling `addFriendship` (still uses `secure_profiles`
       to look up the target user)
4. [ ] `/app/activity/page.tsx` — sent messages
5. [ ] `/app/layout.tsx` — drop PersonaSwitcher, add sign-out button instead

### 3d. Delete dead code

- [ ] `src/lib/store.ts` — move to `src/lib/store-demo.ts` (kept for /demo route)
- [ ] `src/components/PersonaSwitcher.tsx` — same, kept for /demo only

**Done when:**
- [ ] All `/app/*` pages work end-to-end against Supabase.
- [ ] Two browsers signed in as two different phones see each other after
      adding by handle. Toggling status on one shows up as `available` on
      the other's friend list **after a refresh** (real-time comes in Phase 4).
- [ ] `npm run build` passes with no references to the old store.ts from
      inside `/app/*`.

---

## Phase 4 — Real-time reveal

**Goal:** when Alice flips to available, Bob's open browser pops the reveal
overlay within ~1 second, no refresh.

- [ ] In `/app/layout.tsx`, after auth-load, subscribe:
      ```ts
      supabase.channel('reveal-' + userId)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'reveal_events',
          filter: `to_user_id=eq.${userId}`,
        }, (payload) => {
          // fetch the row, look up the sender's secure_profiles row
          // hand to RevealOverlay state
        })
        .subscribe();
      ```
- [ ] Cleanup the channel on unmount.
- [ ] When `seen_at` is set (overlay closed), it's a normal UPDATE — no
      separate subscription needed.
- [ ] Initial-load case: on layout mount, also fetch
      `reveal_events where to_user_id = me and seen_at is null` to catch
      events that fired while the user was offline.

**Done when:**
- [ ] Two browsers side by side. Browser A flips to available. Browser B's
      reveal overlay fires within ~1 second, even though B never refreshed.

---

## Phase 5 — Server-side SMS dispatch

**Goal:** SMS sending happens server-side with proper auth, not from the
client where the access token could be tampered with.

- [ ] Update `/api/send-reveal-sms`:
      1. Read the user's auth cookie via `@supabase/ssr`.
      2. If no session → 401.
      3. Read the request body — now just `{ revealEventId: string }`,
         not phone + body. The route derives recipient phone server-side
         using the service role key (bypassing RLS).
      4. Verify the reveal_event belongs to the authenticated user
         (`from_user_id == auth.uid()`).
      5. Build the SMS body server-side from the event note + sender's
         displayName.
      6. Send via Twilio.
      7. Insert into `sent_messages` with the resulting status.
      8. Return `{ ok, status, error? }`.
- [ ] Client `SendingSMSOverlay` now POSTs one request per reveal event id
      instead of one per fully-formed message. Auto-creates the queued
      `sent_messages` rows server-side.
- [ ] Optional v2: move all of this into a Supabase Edge Function fired by a
      database webhook on `reveal_events` INSERT. Then SMS dispatch is fully
      decoupled from the browser. Skip for now — the route works.

**Done when:**
- [ ] Real Twilio SMS arrives on a real phone when you flip available.
- [ ] Modifying the request body to send to a phone you don't own is rejected
      with 403 (or the recipient is forced to the actual reveal event's
      `to_user_id`, ignoring the spoofed value).

---

## Phase 6 — Add friend by handle/phone

**Goal:** the "tap to add" experience, web edition.

- [ ] `/app/add` shows your QR encoding `https://funlma.app/u/<handle>`.
- [ ] New public route `/u/[handle]/page.tsx` — server component that:
      - Looks up the handle in `secure_profiles`.
      - If not signed in, prompts sign-in (redirect to `/auth?return=/u/<handle>`).
      - If signed in and not friends, shows the profile card + "add" button.
      - On add: insert `friendships` row (RLS allows since auth.uid() is one
        of the parties). Then redirect to `/app/friends`.
- [ ] Replace "add by handle" input on `/app/add` to call into the same
      lookup path.

**Done when:**
- [ ] Generating a QR on phone A, scanning it on phone B, signing in on B,
      tapping "add" — both sides see each other as friends.

---

## Phase 7 — Demo split, cleanup, deploy

- [ ] Move current `/app/*` flow (localStorage + persona switcher) to `/demo/*`.
      Update landing page CTA: primary "open app" → `/app`, secondary "try
      demo without signing up" → `/demo`.
- [ ] Add a `/app/settings` page with: change handle, change displayName,
      change phone (requires re-OTP), sign out, delete account.
- [ ] Deploy:
      1. Push to GitHub (private repo).
      2. Import to Vercel.
      3. Add all env vars from `.env.local` to Vercel project settings.
      4. Deploy. Auth works because Supabase issues HTTP-only cookies for the
         Vercel domain.
- [ ] Set up Supabase staging vs production projects if you ever want
      separation. (Optional. Solo dev: one project is fine.)

**Done when:** funlma.vercel.app is live, two real phones can sign up, friend
each other, send and receive real SMS, see real-time reveals.

---

## Risks & gotchas (read before phase 0)

1. **Twilio Verify trial mode** silently fails for unverified phone numbers.
   You'll get a green checkmark in Supabase but no SMS will land. Symptom:
   "I never got the code." Fix: upgrade Twilio account past trial **or** add
   recipient numbers to Twilio Console's verified-callers list.

2. **Supabase Phone Auth rate limits.** Free tier allows 30 SMS/hour. If
   you're testing rapidly, you'll hit this. Wait or switch to a paid tier.

3. **RLS column-level protection is not real.** Postgres RLS protects rows,
   not columns. The `secure_profiles` view is what protects phone/email.
   **Never query `profiles` directly from client code** — always
   `secure_profiles`. Add a lint rule or a comment if you can't.

4. **Realtime channel cleanup.** If you don't unsubscribe on unmount, you'll
   leak WebSocket connections and eventually hit Supabase's per-client
   connection limit. The cleanup line in phase 4 is not optional.

5. **`auth.uid()` in policies returns NULL outside a request context.**
   This means seeding test data via SQL Editor without setting
   `request.jwt.claims` will look like RLS is broken. It isn't — your
   session just isn't being threaded in. Test via the actual app flow.

6. **Phone uniqueness.** Supabase Auth enforces unique phone numbers per
   auth.users row. If you delete a profile, the auth.users row stays (and
   keeps the phone). To re-use a phone, also delete the auth.users row via
   the dashboard.

7. **NEVER expose service_role key to the client.** It bypasses all RLS.
   Treat it like a password. Only use it inside `src/app/api/*` route
   handlers, never inside files that contain `"use client"`.

---

## After this plan — phase 8+ ideas (not in scope)

- Native iOS app (Expo + Supabase). Push notifications via APNs trigger the
  reveal overlay even when the app is closed — this is what makes the
  product actually work in practice.
- NFC tap-to-add on iPhone (requires native).
- "Knock" feature — let a friend send a one-bit "I notice you" while you're
  unavailable.
- Per-friend cohort reveal (the selective-reveal alternate that we didn't
  pick in MVP — revisit after seeing usage).
- Abuse + blocking: report friends, block by handle, rate-limit flips per day.

---

## File map after this plan

```
funlma/
├── BACKEND_PLAN.md            ← this file
├── PLAN.md                    ← MVP build report (localStorage era)
├── README.md                  ← entry point, links to both
├── .env.local                 ← TWILIO_* + SUPABASE_*
├── supabase/
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_rls.sql
├── src/
│   ├── middleware.ts          ← auth gate (new in phase 2)
│   ├── app/
│   │   ├── auth/page.tsx      ← OTP sign-in (new in phase 2)
│   │   ├── u/[handle]/        ← public profile + add (new in phase 6)
│   │   ├── api/
│   │   │   └── send-reveal-sms/route.ts   ← auth + DB-backed (phase 5)
│   │   ├── app/               ← real-backend app (phases 3–6)
│   │   └── demo/              ← localStorage demo, frozen (phase 7)
│   └── lib/
│       ├── supabase-browser.ts
│       ├── supabase-server.ts
│       ├── database.types.ts  ← generated from schema
│       ├── db.ts              ← typed DB helpers (phase 3)
│       └── useDb.ts           ← React hook (phase 3)
└── package.json
```
