# Unified Page Header

## Context

Header markup is currently duplicated with three inconsistent visual styles:

1. **Mainpage** (`src/app/page.tsx`) — a plain `<header>` inside `max-w-md mx-auto px-4 py-6`, no `Card`/border, not sticky. Left: "tracky.fun" brand wordmark. Right: profile button (behind `NEXT_PUBLIC_PROFILE_ACTIVE`) + `DarkModeToggle`.
2. **`Card`-wrapped headers** — `Card` with `m-4 p-4 flex flex-row justify-between items-center` (some `sticky top-4 z-10`, some not). Left: dice `Image` icon + `<h1>` title (classes `scroll-m-20 sm:text-2xl mb-1 font-extrabold tracking-tight lg:text-3xl text-xl`), both wrapped in a `Link` to `/`. Right: page-specific action buttons, each individually margined with `mr-4`. Used by `/profile`, `/login`, `/freiestracking`, `/multiplayer`, `/multiplayer/[code]` (both lobby and in-game states), `/[gamemode]`.
3. **Yatzy** (`src/app/yatzy/page.tsx`) — bare `sticky` div, `ArrowLeft` + `<h1>` title, no card, no right-side actions.

`/checkout/[gamemode]/page.tsx` has no header row at all today — just a centered logo/title block above the payment form.

The user wants every page's header to look like the mainpage's: same height, no card/border, consistent style — with page-appropriate content substituted in (back arrow instead of the brand wordmark, etc.).

## Goals

- One shared component, `PageHeader`, renders every page's header — including the mainpage's.
- Visually consistent across all pages: no `Card`/border/shadow, `bg-background`, same padding (thus same height), `sticky top-0 z-30` everywhere (including the mainpage, which isn't sticky today).
- Non-mainpage headers use a standard "ArrowLeft + title, links to `/`" left side, replacing the dice-icon-plus-title pattern.
- Title typography is standardized to a static `text-2xl font-extrabold tracking-tight` on every page (dropping the current responsive `text-xl → sm:text-2xl → lg:text-3xl` scaling and stray `scroll-m-20`/`mb-1` classes).
- Right-side action buttons use a `flex items-center gap-3` container instead of per-button `mr-4` margins.
- `/checkout/[gamemode]` gains a header (ArrowLeft + gamemode name), matching the rest of the app.
- Header spans the full page width on every page (not constrained to the mainpage's `max-w-md`), since several pages have wide content (tables, scoring grids) below it.

## Non-goals

- No change to what each page's right-side actions *do* — `Menu`, `Scoring`, `AddPlayer`, `ResetGame`, `GamemodeInfo`, the profile button, `DarkModeToggle`, etc. keep their existing behavior and props. Only their container spacing changes (`mr-4` → parent `gap-3`).
- No change to page content below the header (game boards, tables, forms, roster UI, etc.).
- No change to navigation targets — the back arrow always links to `/`, matching what today's dice-icon link already does (not browser-history "back").
- No new dark-mode toggle on sub-pages — it stays mainpage-only, per existing behavior.
- No change to the dice/logo icon's use elsewhere (e.g. still fine to use `/images/dice.png` in non-header contexts like checkout's payment summary).

## Component: `src/components/PageHeader.tsx`

```ts
type PageHeaderProps = {
  left?: ReactNode;       // fully custom left content — mainpage's brand wordmark only
  backHref?: string;      // e.g. "/" — used when `left` is not given
  title?: string;         // page title, used when `left` is not given
  right?: ReactNode;      // page-specific actions
};
```

Rendering rule: if `left` is provided, render it as-is (mainpage case). Otherwise render the standard back-link block:

```tsx
<Link href={backHref} className="flex items-center">
  <ArrowLeft className="mr-2" size={20} />
  <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
</Link>
```

`right`, if provided, renders in a `<div className="flex items-center gap-3">` on the trailing side.

Outer container: `sticky top-0 z-30 bg-background flex items-center justify-between px-4 py-4`. No `max-w` constraint — full width of whatever parent renders it (pages that need a narrower visual column, like the mainpage's game grid, apply `max-w-md mx-auto` to their own content below the header, same as today).

## Page-by-page changes

| Page | `left` / `backHref`+`title` | `right` (unchanged content, restyled container) |
|---|---|---|
| `/` (`page.tsx`) | `left` = existing brand wordmark span | Profile button (conditional) + `DarkModeToggle` |
| `/yatzy` | `backHref="/"`, `title="Yatzy"` | *(none)* |
| `/profile` | `backHref="/"`, `title="Würfelkarte"` | `Menu` |
| `/login` | `backHref="/"`, `title="Würfelkarte"` | `Menu` |
| `/freiestracking` | `backHref="/"`, `title="Freies Tracking"` | `FreeTrackingScoring` trigger, `AddPlayer` trigger |
| `/multiplayer` | `backHref="/"`, `title="Multiplayer"` | *(none)* |
| `/multiplayer/[code]` (lobby state) | `backHref="/"`, `title=` room's gamemode display name | `Menu` |
| `/multiplayer/[code]` (game state) | `backHref="/"`, `title=` room's gamemode display name | `Scoring` trigger, `Menu` |
| `/[gamemode]` | `backHref="/"`, `title=` gamemode display name | `Scoring` trigger, `AddPlayer` trigger, `ResetGame` trigger, `GamemodeInfo` (conditional), `Menu` |
| `/checkout/[gamemode]` | `backHref="/"`, `title=` gamemode display name *(new)* | *(none)* |

For every page above except the mainpage, this removes the dice/logo `Image` icon from the header and drops the surrounding `Card`.

## Testing

- No automated test runner exists in this repo — verification is manual/visual via the `run` skill.
- Visual check on every page in the table above: header has no card border/shadow, matches mainpage height/padding, sticks to the top on scroll.
- Confirm each page's right-side actions still function (Menu opens, Scoring dialog opens, AddPlayer/ResetGame/GamemodeInfo work, profile button + dark mode toggle work on mainpage).
- Confirm back arrow navigates to `/` from every page, including from mid-game state on `/[gamemode]` and `/multiplayer/[code]`.
- Confirm `/checkout/[gamemode]` renders its new header correctly above the existing payment content.
- Light and dark mode check for the header background/text on at least one page.
