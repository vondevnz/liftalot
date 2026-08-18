# Liftalot

A lift tracker built around daily movement rather than training optimisation.

The activity grid is the product. A workout fills a cell brightly, an hour's
walk fills it dimly, and both fill it brightest — so a rest day from lifting is
still a streak day, and the streak stops fighting sensible programming.

Deliberately absent, and staying that way: steps, 1RM, warm-up sets, routines,
templates.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth)
· Vitest.

Pages fetch through a cookie-backed Supabase server client. The two interactive
surfaces — the walk toggle and set entry — write from the browser with
optimistic local state, because the cell has to flip the instant you tap it and
sets get logged on bad gym wifi.

## Setup

### 1. Create the Supabase project

At [supabase.com/dashboard](https://supabase.com/dashboard), create a project,
then in **SQL Editor** run, in order:

1. `supabase/migrations/0001_init.sql` — tables, the `activity_days` view, RLS, grants
2. `supabase/migrations/0002_grants.sql` — only needed if you ran an early copy
   of `0001` that predates its grants block; re-running is harmless
3. `supabase/migrations/0003_start_workout.sql` — the `start_workout` RPC
4. `supabase/migrations/0004_templates.sql` — saved workouts
5. `supabase/migrations/0005_exercise_history_index.sql` — index for per-exercise history
6. `supabase/migrations/0006_settings_and_progress.sql` — unit preference, manual
   exercise order, and the `exercise_totals` aggregate
7. `supabase/migrations/0007_workout_name.sql` — names on logged sessions
8. `supabase/migrations/0008_total_lifts.sql` — the home screen's combined total
9. `supabase/migrations/0009_total_window.sql` — overall vs 8-week total
10. `supabase/seed.sql` — the preset exercise library (re-runnable)

### 2. Configure auth

**Authentication → URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: add `http://localhost:3000/auth/callback` (and your deployed
  equivalent later)

Email sign-in with magic links is on by default. The callback route handles both
the `?code=` and `?token_hash=` link shapes, so either email template works.

### 3. Environment

```sh
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
**Project Settings → API** (newer projects label the second one "publishable").

### 4. Run

Node 22+ (see `.nvmrc`). `@supabase/supabase-js` builds fine on Node 20 but
prints a deprecation warning on every run.

```sh
nvm use
npm install
npm run dev
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build and typecheck |
| `npm run test` | Vitest — date, streak, and heatmap logic |

## Brand

Assets live in `public/brand/`. The original sources (master SVGs, the brand
guide with clear-space and minimum-size rules) are kept outside the repo.

The theme tokens in `globals.css` are the brand palette *verbatim*, because the
palette was sampled from the app in the first place. Keep them in step: the mark
sits next to heat cells and accent buttons, so a drift of a few hex points shows
as a seam.

The mark is inlined in `src/components/logo.tsx` rather than loaded from
`/brand` — it paints with the first byte of HTML, so there's no logo-shaped hole
on the login screen. `liftalot-lockup.svg` is deliberately *not* used: its
wordmark is an SVG `<text>` node, so it can't inherit the app's type. `Lockup`
renders the word as HTML instead.

Sora (the brand face) is loaded by `next/font/google` in `layout.tsx`, which
self-hosts it at build time — no runtime request to Google, and a metric-matched
fallback so there's no layout shift. It is a **display** face only: the wordmark
and page `<h1>`s wear `font-brand`, everything else stays on the system stack,
which is better tuned for the dense list rows and numeric inputs. Weights 600
and 700 are loaded; the wordmark is 700 at `-0.04em` per the brand guide.

## The two rules worth knowing before editing

**Dates are local, always.** Every date is a `YYYY-MM-DD` string for the
*viewer's* calendar day, built in `src/lib/date.ts`. Nothing else in the app
calls `toISOString()`, and no SQL calls `current_date`. The reason: the naive
UTC slice files a 10pm Auckland session under tomorrow and silently breaks a
40-day streak. Because the server can't know the viewer's timezone, pages render
with the server's date and correct on mount via `useLocalToday`.

**The heatmap level is derived, never stored.** `activity_days` unions
`day_logs` and `workouts` and the client computes
`(has_workout ? 2 : 0) + (walked ? 1 : 0)`. The view's `exists` guard means a
workout only counts once it has at least one set, so opening the logger and
walking away doesn't paint a false cell.

## Layout

```
supabase/migrations/0001_init.sql   schema, activity_days view, RLS
supabase/seed.sql                   ~55 preset exercises
src/lib/date.ts                     the only place dates are constructed
src/lib/streak.ts                   current (with yesterday grace) + longest
src/lib/heatmap.ts                  week columns and month label runs
src/components/activity-heatmap.tsx the grid
src/components/today-view.tsx       owns day state so toggle → cell is instant
src/components/workout-logger.tsx   set entry, optimistic
```

## Deferred

Rest timer, prefill from last session, CSV export, custom exercises, and full
PWA install (there is a manifest and icons, but no service worker and nothing
offline). The schema already accommodates them — `walk_minutes` and
`exercises.user_id` exist and are unused.
