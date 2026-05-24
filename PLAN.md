# FunLma — overnight build report & next-step plan

**Date:** 2026-05-21
**Stack:** Next.js 16.2.6 (App Router, Turbopack) · React 19.2 · TypeScript · Tailwind v4 · Framer Motion 12 · localStorage (no backend)
**Status:** MVP shippable as web demo. Production build passes. All 6 routes prerender.

---

## 1. Run it

```bash
cd funlma
npm run dev       # http://localhost:3000
```

- Landing: `/`
- App: `/app` (auto-redirects to onboarding if no persona on this device)
- The app ships with **two seeded personas** — `Alice` (unavailable, "in a relationship") and `Bob` (available, "single & curious") — already friends.
- Switch personas via the **top-right dropdown** to see both sides of the exchange on one device.

### Try the full flow in 60 seconds
1. Open `/app` — you start as **Bob**. See Alice in friends list with `••• ••• ••••` (hidden).
2. Switch persona → **Alice**. Flip her status switch to *available*. Confirm. Write a note.
3. **An iMessage-style overlay slides in** showing the SMS being sent to each friend's real phone (in demo mode unless Twilio is configured — see §3).
4. Switch persona back → **Bob**. The dramatic reveal overlay fires immediately on entry, showing Alice's real phone & email.
5. Visit `/app/activity` to see the full SMS history per persona.

---

## 2. What was built tonight

### Pages
| Route | What it does |
|---|---|
| `/` | Marketing landing — sells the concept, three-step explainer, target-audience tags |
| `/app` | Your profile, status toggle, private contact info, friend count |
| `/app/friends` | Friends list with hidden vs revealed contact rendering |
| `/app/add` | QR code of your handle + add-by-handle input + one-tap "demo: add other local personas" |
| `/app/activity` | History of every SMS reminder this persona has sent — delivered / demo / failed |
| `/app/onboarding` | Create a new persona (auto-redirected here if none on device) |
| `/api/send-reveal-sms` | Server route. Sends real SMS via Twilio if env vars set; otherwise demo-mode no-op. |

### Components (all client-side)
- `RevealOverlay` — the dramatic moment: backdrop-blurred radial pink gradient, scale-in spring on the avatar, pulsing aura ring, staggered fade-up of phone/email rows, call/email tap-throughs. **This is the product.**
- `SendingSMSOverlay` — bottom-sheet iMessage simulator. When you flip to available, each friend gets a row showing their phone, an animated blue iMessage bubble with the SMS body, and a status badge (sending → sent / demo / failed). Calls the API in sequence with a small stagger so it feels like real messages going out.
- `StatusToggle` — two-step confirmation when flipping to *available*. Last-chance warning makes the irreversibility feel real. Triggers `SendingSMSOverlay` after confirm.
- `PersonaSwitcher` — top-right pill, lets you flip between local personas to demo both sides.
- `AvatarOrb` — hue-based gradient avatar with initials + status dot.
- `FriendCard` — switches between masked `••• ••• ••••` and a real `tel:` / `mailto:` row based on the friend's status.

### Data layer (`src/lib/`)
- `types.ts` — `User`, `Friendship`, `RevealEvent`, `SentMessage`, `FunLmaStore`.
- `store.ts` — pure functions over the store shape: `createUser`, `addFriendship`, `setStatus`, `getUnseenEvents`, `markEventSeen`, `updateMessageStatus`, `buildRevealSmsBody`, etc. Persisted to `localStorage` key `funlma.v2` (bumped from `v1` when the sent-messages slot was added). Auto-seeds Alice + Bob on first load. Cross-tab change events via `funlma:store-changed` custom event.
- `useStore.ts` — React hook + `useActiveUser()` convenience.

### The SMS reminder flow (new feature)
When a user flips to available:
1. `setStatus` synchronously creates one `SentMessage{status: "queued"}` per friend in the store, with a pre-rendered text body (`buildRevealSmsBody`) like `Hey Bob — Alice just flipped to available on FunLma. "single now & curious" Open the app to see their number.`
2. `StatusToggle` opens `SendingSMSOverlay` with those queued messages.
3. The overlay iterates them with a ~350ms stagger, POSTing each to `/api/send-reveal-sms` with `{toPhone, message}`.
4. The route normalizes the phone to E.164 (`+14155550199`), checks `TWILIO_*` env vars, and either calls the Twilio REST API or returns a demo-mode success.
5. Each response updates the message status in the store: `sent-real` / `sent-demo` / `failed`. The overlay reflects this live.
6. The `/app/activity` page renders the full historical list per persona.

This means **the same code path that drives the demo will send real SMS the moment you drop in Twilio credentials** — no rewrite required.

### The reveal mechanic (how the "drama" actually works)
When a user flips to *available*, `setStatus` writes one `RevealEvent` per friend with `seen: false`. The app shell layout (`/app/layout.tsx`) polls `getUnseenEvents(store, activeUser.id)` on every store change. If any are unseen, it pops the overlay with the first one. Closing marks it seen. This means switching personas reliably triggers the popup — same code path as a real push notification would use later.

---

## 2.5. Turning on real SMS

The SMS layer is plumbed end-to-end. To go from demo → real:

1. Sign up at [twilio.com](https://www.twilio.com) (free trial includes credit).
2. Buy or claim a phone number with SMS capability.
3. Copy `.env.local.example` to `.env.local` and fill in:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_FROM=+1XXXXXXXXXX
   ```
4. Restart `npm run dev`.
5. Edit the seeded personas (or create new ones via `/app/onboarding`) to use **real** phone numbers — `555` numbers and most fictitious ranges are auto-skipped by the route as a safety net.

**Free trial caveat:** Twilio trial accounts can only send SMS to phone numbers verified in your console. To text any number, upgrade the account (~$1 minimum). Cost per US SMS is ~$0.0079 at the time of writing.

**What the message looks like:**
> Hey Bob — Alice just flipped to available on FunLma. "single now & curious" Open the app to see their number.

(80–160 chars depending on the note — stays inside one SMS segment in practice.)

---

## 3. What's intentionally NOT in tonight's build

- **No backend for state.** User/friendship/event state still lives in `localStorage`. Two real devices cannot share a friend graph yet.
- **No real push notifications.** The in-app "dramatic reveal" still relies on the receiving persona loading the app. The new SMS is the bridge — it pings the friend's *real phone* with a link to come back and check.
- **No NFC tap-to-add.** Web can't do iPhone NFC. QR is the closest web-native substitute.
- **No image upload / real photos.** Avatars are deterministic gradient orbs.
- **No auth, no email verification.** Anyone can claim any handle on their own device.
- **No selective reveal.** Tonight's design ships the "全员通知 + 大弹窗" path the user chose; selective per-friend reveal is roadmap.
- **No "broken up / dating again" status nuance.** Just binary available/unavailable + a free-text note.

---

## 4. Roadmap — from this demo to a real product

### Phase 1 — make the demo shareable (1–2 days)
- Deploy to Vercel. Now anyone can hit `funlma.vercel.app` and play with the local demo.
- Polish copy. "FunLma" branding, write actual marketing copy in 中文 + English.
- Add a landing-page **embedded interactive demo** that auto-runs the Alice→Bob reveal so visitors get the punchline without signing up.
- Telemetry: PostHog or Plausible, just to see if anyone is actually playing with the toggle.

### Phase 2 — real backend, real two-device flow (1 week)
- **Supabase**: Postgres + Auth (phone OTP + email magic link) + Realtime.
- Replace `localStorage` store with Supabase tables: `users`, `friendships`, `reveal_events`.
- Realtime subscription on `reveal_events` for the active user — popup fires on the *other* phone in real time.
- Server-side row-level security: friend can read your `phone`/`email` columns only when your `status='available'`.

**Schema sketch:**
```sql
create table users (
  id uuid primary key,
  handle text unique not null,
  display_name text,
  email text,
  phone text,
  bio text,
  status text check (status in ('available','unavailable')),
  status_note text,
  status_changed_at timestamptz default now()
);

create table friendships (
  id uuid primary key,
  user_a uuid references users(id),
  user_b uuid references users(id),
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

-- RLS: friends can see contact info only when status = 'available'
create policy "contact_visible_when_available" on users
  for select using (
    status = 'available'
    and exists (select 1 from friendships
                where (user_a = auth.uid() and user_b = users.id)
                   or (user_b = auth.uid() and user_a = users.id))
  );
```

### Phase 3 — native iOS (2–3 weeks)
- React Native (Expo) wrapping the same flows. Or rebuild in Swift if NFC is the marquee.
- **NFC "tap to add"**: iPhone-to-iPhone NFC peer tag exchange is restricted by Apple, but you can use:
  - **NearbyInteraction** (UWB, requires U1 chip — iPhone 11+) for the actual "bump them and add"
  - **NDEF tag write/read** with NFC stickers as a backup
  - **AirDrop-style share sheet** is the path of least resistance
- **Push notifications**: real APNs delivery so the reveal popup fires even when the app is closed.
- App Store review risk: this category gets scrutinized. Position as "professional networking with privacy controls," not "dating."

### Phase 4 — the social-game layer (open-ended)
- **History feed**: "Alice was available 3 times in the last month." Tactical insight into another's signal pattern.
- **"Knocking"**: a friend can leave a single-bit nudge while you're unavailable. You see it next time you check. No content, just a knock count.
- **Streaks & cool-downs**: anti-spam — can't flip available more than once per 24h.
- **Group reveal preview**: see who would be notified before you flip, with face thumbnails. Anxiety-inducing on purpose.
- **Selective reveal**: choose specific friends to reveal to (the alternate path we didn't take tonight).

---

## 5. Real risks

1. **The whole category is sus.** "App for cheating" is the bad framing. The product narrative has to lean hard into *boundary respect* — "we keep your number private until you decide" — not the "海王" framing. The marketing copy I wrote tonight is too on-the-nose; if you're serious about distribution, rewrite as a privacy/networking play.
2. **Two-sided cold start.** Useless unless both people install. Onboarding has to teach the value to two strangers simultaneously. Probably need a fallback: "she gave you a FunLma handle — install in 10 sec to redeem when she goes available."
3. **The reveal is irreversible.** Once contact info goes out, no take-backs. Tonight's two-step confirm helps, but you may want a "revoke" that fires another notification ("she's hidden again") — though that probably feels even worse.
4. **iOS-only via NFC kills your market.** Cross-platform via QR + share-link is more practical even if less magical.
5. **You become responsible for sensitive contact info.** Encryption at rest, deletion compliance, and an abuse/blocking story are non-negotiable before public launch.

---

## 6. Open product questions worth deciding before phase 2

- **Can the same person have multiple "available" notes for different friend cohorts?** (e.g., "available to Alex's circle" vs everyone)
- **Read receipts on the reveal popup?** Does Alice see that Bob saw her availability? Probably yes — that's half the drama.
- **Does the reveal expire?** If Alice goes back to unavailable 3 hours later, does Bob's view of her phone disappear from the friend card? (Default: yes, contact info re-hides. The popup is the one-shot grant; persistent visibility tracks status.)
- **What stops someone from screenshotting the popup?** Nothing. This is a social-trust product, not a security one. Be honest about that.
- **In-app messaging?** Probably no. The whole point is that revealing contact info pushes the conversation out to SMS/email/iMessage. Adding in-app chat dilutes the mechanic.

---

## 7. File map

```
funlma/
├── PLAN.md                          ← you are here
├── .env.local.example               TWILIO_* env vars for real SMS
├── src/
│   ├── app/
│   │   ├── layout.tsx               root html + font wiring
│   │   ├── globals.css              dark theme + accent gradient tokens
│   │   ├── page.tsx                 landing
│   │   ├── api/
│   │   │   └── send-reveal-sms/
│   │   │       └── route.ts         POST: Twilio call OR demo response
│   │   └── app/
│   │       ├── layout.tsx           persona switcher + bottom nav + reveal overlay listener
│   │       ├── page.tsx             /app — profile + status toggle
│   │       ├── add/page.tsx         /app/add — QR + handle input + demo personas
│   │       ├── friends/page.tsx     /app/friends — list with hidden/revealed cards
│   │       ├── activity/page.tsx    /app/activity — sent SMS history (delivered/demo/failed)
│   │       └── onboarding/page.tsx  /app/onboarding — create persona
│   ├── components/
│   │   ├── AvatarOrb.tsx
│   │   ├── FriendCard.tsx
│   │   ├── PersonaSwitcher.tsx
│   │   ├── RevealOverlay.tsx        ← the money component (in-app drama)
│   │   ├── SendingSMSOverlay.tsx    ← the SMS-going-out simulator
│   │   └── StatusToggle.tsx
│   └── lib/
│       ├── types.ts
│       ├── store.ts                 pure functions over FunLmaStore + localStorage
│       └── useStore.ts              React hook
└── package.json
```

---

## TL;DR

The MVP is real and runnable. The "available" reveal — which is the actual product — is built and feels right. Everything that needs a real backend (cross-device sync, push notifications, NFC) is deferred to phase 2 by design. Tonight's job was to make sure the *feeling* of the product is correct; it is.
