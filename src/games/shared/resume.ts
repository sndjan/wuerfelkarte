/**
 * A game left unfinished in storage — what the "Weiterspielen" card shows.
 *
 * Every game builds one from its own stored game (see each game's
 * `resume.ts`); `null` means there is nothing to go back to.
 */
export type RunningGame = {
  /** The registry key — also keeps several cards apart on the home page. */
  gameKey: string;
  gameName: string;
  emoji: string;
  /** The board route that picks the stored game back up. */
  href: string;
  modeName: string;
  players: { name: string; emoji?: string }[];
  /** Where the group left off, e.g. "Runde 4 von 15". */
  progress: string;
};
