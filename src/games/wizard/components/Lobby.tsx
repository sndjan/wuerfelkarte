"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GamemodePills } from "@/games/shared/components/GamemodePills";
import { GamemodeStats } from "@/games/shared/components/GamemodeStats";
import { LobbySection, LobbyShell } from "@/games/shared/components/LobbyShell";
import {
  MatchBadge,
  RecentMatches,
} from "@/games/shared/components/RecentMatches";
import { useMatchHistory } from "@/games/shared/hooks/useMatchHistory";
import { WIZARD_EMOJI, buildStats } from "../config";
import { gamemodeSlug, wizardGamemodes } from "../gamemodes";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  createWizardGame,
  deckSize,
  suggestedRounds,
} from "../scoring";
import { ALL_SPECIAL_CARDS } from "../specialCards";
import { wizardStorage } from "../storage";
import {
  WizardGamemodeKey,
  WizardPlayer,
  WizardSpecialCard,
} from "../types";
import { SpecialCardSelector } from "./SpecialCardSelector";

export function Lobby() {
  const router = useRouter();
  const [selectedGamemode, setSelectedGamemode] =
    useState<WizardGamemodeKey>("Standard");
  const [plusMinusOne, setPlusMinusOne] = useState(false);
  // Preselected in full — the anniversary edition ships all seven Sonderkarten.
  const [selectedCards, setSelectedCards] =
    useState<WizardSpecialCard[]>(ALL_SPECIAL_CARDS);
  // `null` follows the suggested round count automatically as players are
  // toggled; setting a number pins it until the player picks "Vorschlag" again.
  const [roundsOverride, setRoundsOverride] = useState<number | null>(null);
  const history = useMatchHistory(wizardStorage.loadMatches);

  const usesSpecialCards = wizardGamemodes[selectedGamemode].usesSpecialCards;
  const specialCards = usesSpecialCards ? selectedCards : [];
  const cardsInDeck = deckSize(specialCards);

  return (
    <LobbyShell
      title="Wizard"
      emoji={WIZARD_EMOJI}
      minPlayers={MIN_PLAYERS}
      maxPlayers={MAX_PLAYERS}
      onStart={(selected) => {
        const players: WizardPlayer[] = selected.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          emoji: p.emoji,
        }));
        const suggested = suggestedRounds(selected.length, cardsInDeck);
        const totalRounds = Math.min(
          Math.max(roundsOverride ?? suggested, 1),
          suggested,
        );
        wizardStorage.saveGame(
          createWizardGame(
            players,
            totalRounds,
            selectedGamemode,
            plusMinusOne,
            specialCards,
          ),
        );
        router.push(`/wizard/${gamemodeSlug(selectedGamemode)}`);
      }}
      footer={
        <>
          <GamemodeStats
            matches={history.filter((m) => m.gamemode === selectedGamemode)}
            buildStats={buildStats}
          />
          <RecentMatches
            matches={history}
            modeName={(match) =>
              wizardGamemodes[match.gamemode]?.name ?? match.gamemode
            }
            badge={(match) =>
              match.plusMinusOne ? <MatchBadge>±1</MatchBadge> : null
            }
          />
        </>
      }
    >
      {(selected) => {
        const suggested = suggestedRounds(
          selected.length || MIN_PLAYERS,
          cardsInDeck,
        );
        const totalRounds = Math.min(
          Math.max(roundsOverride ?? suggested, 1),
          suggested,
        );

        return (
          <>
            <LobbySection title="Spielmodus">
              <GamemodePills
                gamemodes={wizardGamemodes}
                value={selectedGamemode}
                onChange={setSelectedGamemode}
              />
              <p className="text-sm text-muted-foreground">
                {wizardGamemodes[selectedGamemode].description}
              </p>
            </LobbySection>

            {usesSpecialCards && (
              <LobbySection title="Sonderkarten">
                <SpecialCardSelector
                  value={selectedCards}
                  onChange={setSelectedCards}
                />
              </LobbySection>
            )}

            <LobbySection title="Regeln">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4">
                <div>
                  <p className="text-sm font-medium">Plus/Minus Eins</p>
                  <p className="text-xs text-muted-foreground">
                    Die Summe aller Vorhersagen darf nie der Rundenzahl
                    entsprechen.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={plusMinusOne}
                  onClick={() => setPlusMinusOne((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    plusMinusOne ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      plusMinusOne ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </LobbySection>

            <LobbySection title="Rundenanzahl">
              <p className="text-sm text-muted-foreground">
                {selected.length || MIN_PLAYERS} Spieler · {cardsInDeck} Karten →
                maximal {suggested} Runden.
              </p>
              <div className="flex items-center gap-4 rounded-2xl bg-card p-4">
                <button
                  type="button"
                  aria-label="Weniger Runden"
                  disabled={totalRounds <= 1}
                  onClick={() => setRoundsOverride(Math.max(1, totalRounds - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
                >
                  <Minus size={18} />
                </button>
                <span className="min-w-16 text-center text-2xl font-bold tabular-nums">
                  {totalRounds}
                </span>
                <button
                  type="button"
                  aria-label="Mehr Runden"
                  disabled={totalRounds >= suggested}
                  onClick={() =>
                    setRoundsOverride(Math.min(suggested, totalRounds + 1))
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
                >
                  <Plus size={18} />
                </button>
                {roundsOverride !== null && roundsOverride !== suggested && (
                  <button
                    type="button"
                    className="ml-auto text-sm font-semibold text-brand-accent underline"
                    onClick={() => setRoundsOverride(null)}
                  >
                    Vorschlag ({suggested})
                  </button>
                )}
              </div>
            </LobbySection>
          </>
        );
      }}
    </LobbyShell>
  );
}
