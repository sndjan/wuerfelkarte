# Player Selection Order — Design

## Problem

On the Yatzy lobby ([src/app/yatzy/page.tsx](../../../src/app/yatzy/page.tsx)), players are toggled active/inactive via `PlayerChip`. Today the resulting player card order on the game page always follows fixed roster order, not the order players were tapped. Additionally, there's no visual indication of *when* a player was selected relative to others.

## Goals

- The order in which players are tapped active determines the order of their `PlayerCard`s on the game page.
- While a player chip is active, it shows a small rank number (1, 2, 3…) instead of its emoji, reflecting selection order.
- Deselecting and reselecting a player treats it as a fresh selection — it moves to the end of the order.
- Chips themselves do **not** visually reorder in the lobby; only the rank badge changes. Order only takes effect on the game page.

## Design

### Data model

Add `selectionOrder: number | null` to `RosterPlayer` ([types.ts](../../../src/components/yatzy-lobby/types.ts)).

### `usePlayerRoster` ([usePlayerRoster.ts](../../../src/components/hooks/usePlayerRoster.ts))

- `toggleActive(id)`: when activating, assign `selectionOrder = max(existing selectionOrder values) + 1`. When deactivating, set `selectionOrder = null`.
- `addPlayer`: new players start active, so assign them the next `selectionOrder` the same way.
- On load from storage, backfill `selectionOrder` for any active players that lack one (assign sequentially in existing roster order), so numbers appear immediately for pre-existing data without a migration step.

### Lobby page ([page.tsx](../../../src/app/yatzy/page.tsx))

- Compute `activePlayers` sorted by `selectionOrder` ascending (already filters by `active`).
- Build a `Map<id, rank>` (1-indexed) from that sorted list.
- Pass each player's `rank` (or `undefined` if inactive) to `PlayerChip`.
- Use the same sorted `activePlayers` list when writing to `kniffel:player-names` on start, so in-game order matches selection order (relies on `useKniffel`'s existing behavior of preserving array order).

### `PlayerChip` ([PlayerChip.tsx](../../../src/components/yatzy-lobby/PlayerChip.tsx))

- Accept a new `selectionNumber?: number` prop.
- When `player.active` and `selectionNumber` is set, render the number instead of the emoji; otherwise render the emoji as today.

## Out of scope

- No change to in-game reordering (`moveToLeft`/`moveToRight` on `PlayerCard`) — that remains a separate, independent mechanism.
- No change to chip layout/visual position in the lobby.
