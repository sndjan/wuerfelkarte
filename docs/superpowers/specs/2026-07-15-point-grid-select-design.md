# Custom Grid Select for Point Entry

## Context

`PlayerCard` ([src/components/PlayerCard.tsx](../../../src/components/PlayerCard.tsx)) uses shadcn's `Select` (wrapping `@radix-ui/react-select`) for every scoring field. The trigger is a thin `h-2` colored bar; opening it shows a vertical list of options (point values), plus "Zurücksetzen" and "❌" items at the bottom.

Field option counts vary widely — from 1 (`"Full House": [25]`) to 31 (`"Chance"`, `"Dreierpasch"`: `allKniffel`/`allKniffelPlus`) — see [gamemodes.ts](../../../src/components/gamemodes/gamemodes.ts). `PlayerCard` sits inside a horizontally-scrolling, `overflow-x-auto` container (`#player-container` in [page.tsx](../../../src/app/yatzy/[gamemode]/page.tsx)) since cards are laid out as a snap-scroll carousel.

The user wants to replace the vertical-list dropdown with a custom popup: a 4-column grid of circular number buttons, with a "Zurücksetzen" and "Streichen" button below.

## Goals

- Replace `Select`/`SelectContent`/`SelectItem`/etc. usage in `PlayerCard` with a new custom component, `GridSelect` ([src/components/ui/grid-select.tsx](../../../src/components/ui/grid-select.tsx)).
- Trigger (closed state) is visually unchanged: same `h-2` bar, same white/gray/red background logic for empty/filled/crossed-out states, same label placeholder text.
- Open state is a custom panel, portal-rendered to `document.body` (to escape `#player-container`'s clipping), positioned directly below the trigger at the trigger's left edge and width.
- Panel contents:
  - A 4-column grid of circular buttons, one per option value. Selected value is filled green with white text; unselected are light muted circles with dark text. Values that don't fit two digits (e.g. `500`) use a smaller font within the same circle size.
  - Below the grid, two pill buttons: "Zurücksetzen" (neutral/outline) on the left, "Streichen" (red/destructive) on the right.
- Picking a number or either action button calls `onValueChange` with the same value contract as today (numeric string / `"reset"` / `"X"`) and closes the panel.
- Clicking outside the panel and trigger, or pressing Escape, closes the panel without changing the value. No dimmed backdrop.
- Panel caps its height to the remaining viewport space below the trigger and scrolls internally if the grid doesn't fit (relevant for 24–31 option fields, which render as 6–8 rows).
- Opening a second `GridSelect` while another is open closes the first cleanly (no race between the outside-click-close and the new trigger's open).

## Non-goals

- No change to `PlayerCard`'s `onValueChange` logic (confetti triggers, `updatePoints` calls) — the value contract passed to it is unchanged.
- No change to any other consumer — `Select` is only used in `PlayerCard`, so no other files change.
- No full Radix-level accessibility (focus trap, roving tabindex, screen-reader announcements). Minimal aria only (see below), matching the lightweight custom-aria pattern already used for the toggle switches in [page.tsx](../../../src/app/yatzy/[gamemode]/page.tsx) (`role="switch" aria-checked`).
- No animation polish beyond a basic open/close transition; not a design requirement here.
- `@radix-ui/react-select` dependency removal from `package.json` is out of scope for this spec (can be cleaned up separately once `GridSelect` ships).

## Component: `src/components/ui/grid-select.tsx`

```ts
type GridSelectProps = {
  value: string;                       // current value, "" if unset
  onValueChange: (value: string) => void;
  options: Array<number | string>;
  label: string;                       // placeholder shown when value is ""
  disabled?: boolean;
  className?: string;                  // forwarded to the trigger, same as today's SelectTrigger className usage
};
```

State: `open: boolean`, plus a `triggerRef` and `panelRef`.

**Trigger** — a `<button>` with the same className logic `PlayerCard` builds today (moved into `GridSelect` or passed in via `className` — decide during implementation, whichever keeps `PlayerCard`'s per-field color logic simplest to port), `aria-haspopup="listbox"`, `aria-expanded={open}`. Displays the current value or `label` placeholder, same as `SelectValue` does today. Clicking toggles `open`.

**Panel** — rendered via `createPortal(..., document.body)` only when `open`. On open (and on window `scroll`/`resize` while open), compute `position: fixed; top; left; width` from `triggerRef.current.getBoundingClientRect()`. Structure:

```tsx
<div role="listbox" style={{ position: "fixed", top, left, width }} className="...">
  <div className="grid grid-cols-4 gap-2 p-3">
    {options.map(opt => (
      <button role="option" aria-selected={value === String(opt)} className="rounded-full ...">
        {opt}
      </button>
    ))}
  </div>
  <div className="flex items-center justify-between gap-2 p-3 pt-0">
    <button className="rounded-full ... (outline)">Zurücksetzen</button>
    <button className="rounded-full ... (destructive)">Streichen</button>
  </div>
</div>
```

Max-height on the outer panel div, e.g. `maxHeight: calc(100vh - top - 16px)`, with `overflow-y-auto` on the grid area if content exceeds it.

**Closing behavior:**
- Any grid button click → `onValueChange(String(opt))`, close.
- "Zurücksetzen" click → `onValueChange("reset")`, close.
- "Streichen" click → `onValueChange("X")`, close.
- Global `mousedown` listener while open: if the click target is outside both `triggerRef` and `panelRef`, close without calling `onValueChange` — *unless* the target is another `GridSelect`'s trigger, in which case this panel closes and lets that trigger's own click handler open its panel (avoids the two handlers racing on the same click).
- `Escape` keydown while open closes without changing value.

## `PlayerCard` changes

Replace the `Select`/`SelectContent`/`SelectGroup`/`SelectItem`/`SelectTrigger`/`SelectValue` import and JSX block (lines 14–21 and 136–177 today) with:

```tsx
<GridSelect
  value={playerPoints[key] !== 0 && playerPoints[key] !== undefined ? playerPoints[key].toString() : ""}
  onValueChange={(value) => onValueChange(value, key)}
  options={selectOptions ?? []}
  label={label}
  disabled={readOnly}
  className={/* existing bg-white/bg-gray-100/bg-red-100 logic, unchanged */}
/>
```

`onValueChange(value, key)` in `PlayerCard` (lines 72–88) is untouched.

## Edge cases

- **1-option fields** (e.g. `"Full House": [25]`): grid renders a single circle in the top-left cell; action buttons still render below.
- **31-option fields** (`allKniffelPlus`): 4 columns → 8 rows; panel scrolls internally if it doesn't fit below the trigger.
- **`disabled`/read-only usage** (e.g. the scoreboard's read-only `PlayerCard`): trigger doesn't open the panel, same as today's disabled `Select`.
- **Multiple cards open simultaneously**: each `GridSelect` instance owns its own `open` state; see outside-click handling above for the two-triggers-in-one-click case.

## Testing

- No automated test runner in this repo — verification is manual via the `run` skill.
- Visual check: trigger looks pixel-identical to today in all three states (empty/filled/crossed) across at least two gamemodes with different option-count fields (e.g. a 1-option field and a 31-option field).
- Interaction check: tapping a grid number updates the trigger and closes the panel; "Zurücksetzen" resets to empty; "Streichen" shows the crossed-out red state.
- Click-outside and Escape both close the panel without changing the value.
- Opening a second card's `GridSelect` while one is already open closes the first and opens the second correctly.
- Confirm the panel is not clipped when its trigger is on a card scrolled partway through the horizontal `#player-container` carousel.
- Confirm confetti still fires for the existing achievement conditions (e.g. `"Wunder"` field hitting `30`/`50`/`100`).
- Light and dark mode check for the panel, grid circles, and action buttons.
