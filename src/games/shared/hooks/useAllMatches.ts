"use client";

import { useMemo } from "react";

import { caboStorage } from "@/games/cabo/storage";
import { dartsStorage } from "@/games/darts/storage";
import { flip7Storage } from "@/games/flip7/storage";
import { wizardStorage } from "@/games/wizard/storage";
import { yatzyStorage } from "@/games/yatzy/storage";
import type { MatchPlayer, StoredMatch } from "../types";
import { useMatchHistory } from "./useMatchHistory";

/** Every finished table game (Würfelkarte, Wizard, Flip 7, Cabo, Darts), newest data after a sync. */
export function useAllMatches(): StoredMatch<MatchPlayer>[] {
  const yatzy = useMatchHistory(yatzyStorage.loadMatches);
  const wizard = useMatchHistory(wizardStorage.loadMatches);
  const flip7 = useMatchHistory(flip7Storage.loadMatches);
  const cabo = useMatchHistory(caboStorage.loadMatches);
  const darts = useMatchHistory(dartsStorage.loadMatches);
  return useMemo(
    () => [...yatzy, ...wizard, ...flip7, ...cabo, ...darts] as StoredMatch<MatchPlayer>[],
    [yatzy, wizard, flip7, cabo, darts],
  );
}
