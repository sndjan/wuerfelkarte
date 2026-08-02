"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AddPlayerDialog } from "@/components/yatzy-lobby/AddPlayerDialog";
import { PlayerChip } from "@/components/yatzy-lobby/PlayerChip";
import { gamemodeSlug, wizardGamemodes } from "@/components/wizard/gamemodes";
import { usePlayerRoster } from "@/components/hooks/usePlayerRoster";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  createWizardGame,
  deckSize,
  suggestedRounds,
} from "@/components/wizard/scoring";
import { ALL_SPECIAL_CARDS } from "@/components/wizard/specialCards";
import { SpecialCardSelector } from "@/components/wizard/SpecialCardSelector";
import { saveWizardGame } from "@/components/wizard/storage";
import {
  WizardGamemodeKey,
  WizardPlayer,
  WizardSpecialCard,
} from "@/components/wizard/types";
import { WizardGamemodePillSelector } from "@/components/wizard/WizardGamemodePillSelector";
import { WizardGamemodeStats } from "@/components/wizard/WizardGamemodeStats";
import { WizardRecentMatchesList } from "@/components/wizard/WizardRecentMatchesList";
import { Minus, Plus } from "lucide-react";

export default function WizardLobby() {
  const router = useRouter();
  const {
    roster,
    addPlayer,
    toggleActive,
    renamePlayer,
    changeEmoji,
    removePlayer,
  } = usePlayerRoster();
  const [selectedGamemode, setSelectedGamemode] =
    useState<WizardGamemodeKey>("Standard");
  const [plusMinusOne, setPlusMinusOne] = useState(false);
  // Preselected in full — the anniversary edition ships all seven Sonderkarten.
  const [selectedCards, setSelectedCards] =
    useState<WizardSpecialCard[]>(ALL_SPECIAL_CARDS);
  // `null` follows the suggested round count automatically as players are
  // toggled; setting a number pins it until the player picks "Vorschlag" again.
  const [roundsOverride, setRoundsOverride] = useState<number | null>(null);

  const activePlayers = roster
    .filter((player) => player.active)
    .sort((a, b) => (a.selectionOrder ?? 0) - (b.selectionOrder ?? 0));

  const selectionNumbers = new Map(
    activePlayers.map((player, index) => [player.id, index + 1]),
  );

  const usesSpecialCards = wizardGamemodes[selectedGamemode].usesSpecialCards;
  const specialCards = usesSpecialCards ? selectedCards : [];
  const cardsInDeck = deckSize(specialCards);
  const suggested = suggestedRounds(
    activePlayers.length || MIN_PLAYERS,
    cardsInDeck,
  );
  const totalRounds = Math.min(Math.max(roundsOverride ?? suggested, 1), suggested);
  const canStart =
    activePlayers.length >= MIN_PLAYERS && activePlayers.length <= MAX_PLAYERS;

  const handleStart = () => {
    if (!canStart) return;
    const players: WizardPlayer[] = activePlayers.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      emoji: p.emoji,
    }));
    const game = createWizardGame(
      players,
      totalRounds,
      selectedGamemode,
      plusMinusOne,
      specialCards,
    );
    saveWizardGame(game);
    router.push(`/wizard/${gamemodeSlug(selectedGamemode)}`);
  };

  return (
    <>
      <PageHeader backHref="/" title="Wizard" />
      <div className="flex flex-col gap-6 px-4 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spieler
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {roster.map((player) => (
              <PlayerChip
                key={player.id}
                player={player}
                selectionNumber={selectionNumbers.get(player.id)}
                onToggleActive={toggleActive}
                onRename={renamePlayer}
                onChangeEmoji={changeEmoji}
                onRemove={removePlayer}
              />
            ))}
            <AddPlayerDialog onAdd={addPlayer} />
          </div>
          {!canStart && activePlayers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Wizard braucht {MIN_PLAYERS}–{MAX_PLAYERS} Spieler (aktuell{" "}
              {activePlayers.length}).
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Spielmodus
          </h2>
          <WizardGamemodePillSelector
            value={selectedGamemode}
            onChange={setSelectedGamemode}
          />
          <p className="text-sm text-muted-foreground">
            {wizardGamemodes[selectedGamemode].description}
          </p>
        </div>

        {usesSpecialCards && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Sonderkarten
            </h2>
            <SpecialCardSelector
              value={selectedCards}
              onChange={setSelectedCards}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Regeln
          </h2>
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
              className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Rundenanzahl
          </h2>
          <p className="text-sm text-muted-foreground">
            {activePlayers.length || MIN_PLAYERS} Spieler · {cardsInDeck} Karten
            → maximal {suggested} Runden.
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
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          🧙 Spiel starten
        </button>

        <WizardGamemodeStats gamemode={selectedGamemode} />

        <WizardRecentMatchesList />
      </div>
    </>
  );
}
