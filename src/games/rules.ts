import { caboGamemodes } from "./cabo/gamemodes";
import { dartsGamemodes } from "./darts/gamemodes";
import { flip7Gamemodes } from "./flip7/gamemodes";
import { games } from "./registry";
import { CATEGORY_DESCRIPTIONS } from "./speedrun/config";
import { wizardGamemodes } from "./wizard/gamemodes";
import { gamemodes as yatzyGamemodes } from "./yatzy/gamemodes";

/**
 * Every rule text of the app in one list, for the /regeln page. The texts
 * themselves live with each game's modes (`information`), so a rule is only
 * ever written once; the Würfelkarte's solo modes have theirs here.
 */

export type RuleMode = {
  /** Unique across games, e.g. "yatzy-wunderplus". */
  id: string;
  /** The mode's part of its rules route, e.g. "wunderplus". */
  slug: string;
  name: string;
  description?: string;
  /** An intro line, then the rules ("• …"). */
  lines: readonly string[];
};

export type RuleGame = {
  key: string;
  name: string;
  emoji: string;
  href?: string;
  modes: RuleMode[];
};

type ModeConfig = { name: string; description?: string; information?: readonly string[] };

/** "WunderPlus" → "wunderplus": a mode key as it appears in a rules route. */
export const modeSlug = (mode: string) => mode.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The rules screen of one mode, e.g. "/regeln/yatzy/wunderplus". */
export const rulesHref = (game: string, mode: string) => `/regeln/${game}/${modeSlug(mode)}`;

const modesOf = (key: string, configs: Record<string, ModeConfig>): RuleMode[] =>
  Object.entries(configs).map(([mode, config]) => ({
    id: `${key}-${modeSlug(mode)}`,
    slug: modeSlug(mode),
    name: config.name,
    description: config.description,
    lines: config.information ?? [],
  }));

const SOLO_MODES: Record<string, RuleMode[]> = {
  quiz: [
    {
      id: "quiz",
      slug: "quiz",
      name: "Tagesquiz",
      description: "Jeden Tag drei Aufgaben – für alle dieselben.",
      lines: [
        "Jede Aufgabe ist ein ganzer Zug aus einem laufenden Spiel. Gesucht ist der beste Zug, nicht der, der jetzt die meisten Punkte bringt.",
        "• Der beste Zug ist der, mit dem du am Ende im Schnitt die höchste Punktzahl erreichst. Das rechnet ein Solver für jede Entscheidung genau aus.",
        "• Bewertet wird jede Entscheidung im Zug: welche Würfel du hältst, wann du aufhörst und welches Feld du einträgst.",
        "• Eine Aufgabe ohne verschenkten Punkt bringt 100 Punkte, ein Tag also höchstens 300.",
        "• Spielst du an mehreren Tagen hintereinander, wächst deine Serie.",
      ],
    },
  ],
  training: [
    {
      id: "training",
      slug: "training",
      name: "Training",
      description: "Eine ganze Karte allein, mit Rückmeldung nach jedem Zug.",
      lines: [
        "Du spielst eine volle Karte mit echten Zufallswürfeln, nach den Regeln des Klassikers.",
        "• Jede Entscheidung wird wie im Quiz vom Solver bewertet.",
        "• Nach jedem Zug siehst du, ob es einen besseren gab und wie viele Punkte er im Schnitt gebracht hätte.",
        "• Am Ende gibt es eine Auswertung mit deinen größten Fehlern.",
      ],
    },
  ],
  speedrun: [
    {
      id: "speedrun",
      slug: "speedrun",
      name: "Speedrun",
      description: CATEGORY_DESCRIPTIONS.classic,
      lines: [
        "Eine volle Karte gegen die Uhr. Die Uhr startet mit dem ersten Wurf und hält nicht an.",
        "• Jede Entscheidung bewertet der Solver. Jeder Punkt, den ein Zug im Schnitt verschenkt, kostet eine Strafsekunde.",
        "• Gewertet wird Zeit plus Strafe. Die Punkte auf der Karte zählen nicht – Glück beim Würfeln hilft dir nicht.",
        "• Jeder Lauf hat einen Seed. Mit demselben Seed kommen dieselben Würfel, so kannst du Läufe nachspielen oder gegen Freunde antreten.",
        "• Läufe mit eingegebenem Seed zählen nicht für die Bestzeit.",
      ],
    },
  ],
  online: [
    {
      id: "online",
      slug: "online",
      name: "Online",
      description: "Zusammen spielen, jeder am eigenen Handy.",
      lines: [
        "Es gelten die Regeln des gewählten Modus der Würfelkarte.",
        "• Mit digitalen Würfeln würfelt und rechnet die App, mit echten Würfeln würfelt jeder selbst und trägt ein.",
        "• Freunde mit Konto lädst du direkt ein, alle anderen per Link.",
        "• Auf der Startseite siehst du, wer gerade dran ist.",
      ],
    },
  ],
};

const GAME_MODES: Record<string, RuleMode[]> = {
  ...SOLO_MODES,
  yatzy: modesOf("yatzy", yatzyGamemodes),
  wizard: modesOf("wizard", wizardGamemodes),
  flip7: modesOf("flip7", flip7Gamemodes),
  cabo: modesOf("cabo", caboGamemodes),
  darts: modesOf("darts", dartsGamemodes),
};

// The Würfelkarte itself first, then its solo and online modes, then the rest.
const ORDER = ["yatzy", "quiz", "training", "speedrun", "online"];

export const ruleGames: RuleGame[] = games
  .filter((game) => !game.locked && GAME_MODES[game.key])
  .sort((a, b) => {
    const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);
    return rank(a.key) - rank(b.key);
  })
  .map((game) => ({
    key: game.key,
    name: game.name,
    emoji: game.emoji,
    href: game.href,
    modes: GAME_MODES[game.key],
  }));

/** A game and one of its modes, by the slugs of their rules route. */
export function findRules(game: string, mode: string): { game: RuleGame; mode: RuleMode } | null {
  const found = ruleGames.find((g) => g.key === game);
  const rules = found?.modes.find((m) => m.slug === mode);
  return found && rules ? { game: found, mode: rules } : null;
}
