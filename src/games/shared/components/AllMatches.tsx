"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CABO_EMOJI } from "@/games/cabo/config";
import { caboGamemodes } from "@/games/cabo/gamemodes";
import { caboStorage } from "@/games/cabo/storage";
import { FLIP7_EMOJI } from "@/games/flip7/config";
import { flip7Gamemodes } from "@/games/flip7/gamemodes";
import { flip7Storage } from "@/games/flip7/storage";
import { WIZARD_EMOJI } from "@/games/wizard/config";
import { wizardGamemodes } from "@/games/wizard/gamemodes";
import { wizardStorage } from "@/games/wizard/storage";
import { YATZY_EMOJI } from "@/games/yatzy/config";
import { gamemodes as yatzyGamemodes } from "@/games/yatzy/gamemodes";
import { yatzyMatchActionInfo } from "@/games/yatzy/matchAction";
import { yatzyStorage } from "@/games/yatzy/storage";
import { useMatchHistory } from "../hooks/useMatchHistory";
import { MatchAction } from "./RecentMatches";

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

type Row = {
  id: string;
  gameEmoji: string;
  gameName: string;
  gamemodeName: string;
  timestamp: string;
  players: { name: string; score: number }[];
  action: MatchAction | null;
  /** Golf-scored games (Cabo, …) win with the lowest total instead of the highest. */
  lowerIsBetter: boolean;
};

/** Every match ever played, across every game and gamemode, newest first. */
export function AllMatches() {
  const router = useRouter();
  const yatzyMatches = useMatchHistory(yatzyStorage.loadMatches);
  const wizardMatches = useMatchHistory(wizardStorage.loadMatches);
  const flip7Matches = useMatchHistory(flip7Storage.loadMatches);
  const caboMatches = useMatchHistory(caboStorage.loadMatches);

  const rows: Row[] = [
    ...yatzyMatches.map((match) => {
      const info = yatzyMatchActionInfo(match);
      return {
        id: `yatzy:${match.id}`,
        gameEmoji: YATZY_EMOJI,
        gameName: "Yatzy",
        gamemodeName: yatzyGamemodes[match.gamemode]?.name ?? match.gamemode,
        timestamp: match.timestamp,
        players: match.players,
        action: info && {
          label: info.label,
          icon: info.icon,
          onClick: () => router.push(info.href),
        },
        lowerIsBetter: false,
      };
    }),
    ...wizardMatches.map((match) => ({
      id: `wizard:${match.id}`,
      gameEmoji: WIZARD_EMOJI,
      gameName: "Wizard",
      gamemodeName: wizardGamemodes[match.gamemode]?.name ?? match.gamemode,
      timestamp: match.timestamp,
      players: match.players,
      action: null,
      lowerIsBetter: false,
    })),
    ...flip7Matches.map((match) => ({
      id: `flip7:${match.id}`,
      gameEmoji: FLIP7_EMOJI,
      gameName: "Flip 7",
      gamemodeName: flip7Gamemodes[match.gamemode]?.name ?? match.gamemode,
      timestamp: match.timestamp,
      players: match.players,
      action: null,
      lowerIsBetter: false,
    })),
    ...caboMatches.map((match) => ({
      id: `cabo:${match.id}`,
      gameEmoji: CABO_EMOJI,
      gameName: "Cabo",
      gamemodeName: caboGamemodes[match.gamemode]?.name ?? match.gamemode,
      timestamp: match.timestamp,
      players: match.players,
      action: null,
      lowerIsBetter: true,
    })),
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="min-h-full bg-background">
      <PageHeader backHref="/" title="Alle Spiele" />
      <div className="mx-auto  px-4 pb-6">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Spiele gespeichert.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => {
              const winner = [...row.players].sort((a, b) =>
                row.lowerIsBetter ? a.score - b.score : b.score - a.score,
              )[0];
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold">
                      {row.gameEmoji} {row.gameName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.gamemodeName}
                    </p>
                     <p className="text-sm text-muted-foreground">
                      {formatDate(row.timestamp)}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {row.players.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {row.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={row.action.onClick}
                      >
                        <row.action.icon className="size-4" />
                        {row.action.label}
                      </Button>
                    )}
                    {winner && (
                      <p className="font-bold text-brand-accent">
                        🏆 {winner.name} · {winner.score}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
