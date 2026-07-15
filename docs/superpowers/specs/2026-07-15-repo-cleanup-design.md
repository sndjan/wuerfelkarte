# Repo Cleanup: Remove Multiplayer, Freies Tracking, and Supabase/Auth

## Context

The `/yatzy` lobby rewrite ([2026-07-14-yatzy-lobby-redesign](2026-07-14-yatzy-lobby-redesign-design.md)) replaced the last in-app entry points into multiplayer and Freies Tracking — the current games grid (`src/components/games/games.ts`) only links to `/yatzy`, with `wizard`/`cabo`/`skullking` locked and no `href`. Multiplayer, Freies Tracking, and the Supabase-backed login/profile feature are all orphaned code paths that still build and ship but are unreachable from the UI. This is a removal-only cleanup pass; no new features.

## Goals

- Delete the multiplayer feature (pages, API routes, hooks/types).
- Delete the Freies Tracking feature (page, components, hook).
- Delete Supabase/auth entirely — login, profile, auth callback, error page, `src/lib/supabase/*`, `src/middleware.ts`, the `PROFILE_ACTIVE`-gated code paths in `Menu.tsx` / `page.tsx` / `login/page.tsx`, and the "Match speichern" block in `Scoring.tsx`.
- Remove the now-unused `@supabase/ssr` and `@supabase/supabase-js` dependencies and the empty `supabase/migrations/` directory.
- Leave `.env.local` untouched (user's to edit) but note the Supabase env vars are no longer read by the app.
- Produce a separate written report (not applied) of other unused code found while sweeping the repo post-removal: unused `components/ui/*` primitives, unused npm dependencies, orphaned components/hooks.

## Non-goals

- No changes to gameplay code: `/[gamemode]/page.tsx`, `useKniffel`, `Player` type, `PlayerCard`, gamemodes config, the yatzy lobby.
- No deletion of hosted Supabase tables/data — only application code that calls them.
- No automatic deletion of anything surfaced in the unused-code audit — that's a report for the user to act on separately.
- No editing of `.env.local`.

## Scope: files to remove

**Multiplayer**
- `src/app/multiplayer/page.tsx`, `src/app/multiplayer/[code]/page.tsx`
- `src/app/api/multiplayer/rooms/route.ts`, `src/app/api/multiplayer/rooms/[code]/join/route.ts`, `.../start/route.ts`, `.../score/route.ts`
- `src/components/hooks/useMultiplayerGame.ts`, `src/components/hooks/multiplayer-types.ts`

**Freies Tracking**
- `src/app/freiestracking/page.tsx`
- `src/components/FreeTrackingCard.tsx`, `src/components/FreeTrackingScoring.tsx`
- `src/components/hooks/useFreeTracking.ts`

**Supabase/auth**
- `src/app/login/` (`page.tsx`, `actions.ts`), `src/app/profile/` (`page.tsx`, `DisplayNameEditor.tsx`), `src/app/auth/confirm/route.ts`, `src/app/error/page.tsx`
- `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`, `client-game.ts`, `middleware.ts`
- `src/middleware.ts`
- `supabase/migrations/` (and `supabase/` if left empty)

## Scope: code edits (not full-file deletes)

- `src/components/Menu.tsx` — drop the `PROFILE_ACTIVE` import/conditional and the "Profil" menu item.
- `src/app/page.tsx` — drop the `PROFILE_ACTIVE` import/conditional and the profile icon button.
- `src/components/Scoring.tsx` — remove `createGameClient` import, `handleSaveMatch`, the `saveStatus` state, and the `PROFILE_ACTIVE`-gated "Match speichern" UI block.
- `package.json` — remove `@supabase/ssr` and `@supabase/supabase-js` from `dependencies`.

## Verification

- `npm run build` succeeds with no dangling imports of removed modules.
- `npm run lint` passes.
- Manually click through: `/`, `/yatzy`, `/yatzy/[gamemode]` for at least one mode, confirming no console errors and no broken links to `/login`, `/profile`, `/multiplayer`, `/freiestracking`.
- Confirm `/login`, `/profile`, `/multiplayer`, `/freiestracking` now 404.

## Follow-up deliverable (not part of this plan's file changes)

After the removal lands, run a repo-wide sweep for unused code and present findings as a list (component/hook/dependency, why it looks unused, confidence) — no deletions applied.
