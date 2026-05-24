# Hey Next

> **The next is the best.**

A boundary-aware contact-reveal app for ambiguous romantic situations.

Two people add each other as Hey Next friends instead of trading phone numbers.
When one of them flips to **available**, the other gets a dramatic in-app
reveal of their real phone + email, plus an SMS reminder to come check.

---

## Where things stand

| What | Where |
|---|---|
| 🟢 **MVP build (localStorage demo)** is shippable and runnable | [PLAN.md](./PLAN.md) |
| 🚧 **Real backend (Supabase + Auth + Realtime)** is planned, not built | [BACKEND_PLAN.md](./BACKEND_PLAN.md) |

If you're just looking to see the product feel, run the demo. If you're
ready to make it work between two real people on two real phones, follow
BACKEND_PLAN.md phase by phase.

This repo will continue development in **Base44** — the local Next.js code
is the design reference / spec.

---

## Run the demo

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app ships with two seeded personas (Alice + Bob) already friends. Use
the persona switcher (top-right) to flip between them and feel the
unavailable → available reveal flow on a single device.

To send **real SMS** from the demo, copy `.env.local.example` to
`.env.local` and fill in your Twilio credentials.

---

## Architecture today

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4
- All data in browser localStorage (key `funlma.v2` — kept for back-compat)
- Framer Motion 12 for the reveal + lock + hearts animations
- One server route: `/api/send-reveal-sms` — calls Twilio if configured,
  else demo-no-op

## Architecture target (BACKEND_PLAN.md)

- Same frontend, plus Supabase (Postgres + Auth + Realtime) for state
- Phone OTP sign-in
- Row-Level Security: contact info visible to friends iff `status='available'`
- Real-time reveal popups via Supabase Realtime subscriptions
- Deploy on Vercel

---

## Quick links

- [PLAN.md](./PLAN.md) — what's built, why, and what's deferred
- [BACKEND_PLAN.md](./BACKEND_PLAN.md) — phase-by-phase plan to make it real
- [COMPETITORS.md](./COMPETITORS.md) — competitive landscape research
- [`AGENTS.md`](./AGENTS.md) — heads-up for AI coding agents working on this repo
