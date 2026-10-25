import { runningCaboGame } from "./cabo/resume";
import { runningDartsGame } from "./darts/resume";
import { runningFlip7Game } from "./flip7/resume";
import { RunningGame } from "./shared/resume";
import { runningWizardGame } from "./wizard/resume";
import { runningYatzyGame } from "./yatzy/resume";

/** Every game left unfinished, in registry order — for the home page. */
export const loadRunningGames = (): RunningGame[] =>
  [
    runningYatzyGame(),
    runningWizardGame(),
    runningFlip7Game(),
    runningCaboGame(),
    runningDartsGame(),
  ].filter((game): game is RunningGame => game !== null);
