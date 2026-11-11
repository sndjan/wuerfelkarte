"use client";

import { EllipsisVertical, Info, LogOut, UserX, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScoreDialog } from "@/games/shared/components/ScoreDialog";
import { ROLL_MS } from "@/games/quiz/components/Die";
import { shareConfig } from "@/games/yatzy/config";
import { gamemodes } from "@/games/yatzy/gamemodes";
import { callOnline, OnlineError } from "../client";
import { fieldOptions, wunderFieldOf } from "../dice";
import {
  canAddExtraWunder,
  canKeep,
  candidateFields,
  currentMission,
  currentRules,
  digitalEntry,
  fieldKeys,
  forcedKeeps,
  nextRoll,
  scoresRevealed,
  seatScore,
  type Cell,
  type OnlineState,
} from "../engine";
import type { LiveHolds } from "../hooks/useOnline";
import type { GameRow } from "../types";
import { OnlineDice } from "./OnlineDice";
import { OnlineSheet, type CellPicker } from "./OnlineSheet";

const errorText = (error: unknown) => (error instanceof OnlineError ? error.message : "Hat nicht geklappt.");

type Confirm = { title: string; text: string; run: () => Promise<void> };

const labelOf = (state: OnlineState, field: string) =>
  gamemodes[state.gamemode].fields.find((f) => f.key === field)?.label ?? field;

const MEDALS = ["🥇", "🥈", "🥉"];

/** The running (or finished) online game. */
export function OnlineBoard({
  game,
  userId,
  holds,
  sendHolds,
  accept,
}: {
  game: GameRow;
  userId: string;
  holds: LiveHolds | null;
  sendHolds: (holds: LiveHolds) => void;
  accept: (row: GameRow) => void;
}) {
  const router = useRouter();
  const state = game.state as OnlineState;
  const config = gamemodes[state.gamemode];
  const mySeat = state.seats.findIndex((s) => s.userId === userId);
  const running = game.status === "running";
  const finished = game.status === "finished";
  const isHost = game.host_id === userId;
  const digital = state.diceMode === "digital";
  const current = state.seats[state.current];
  const myTurn = running && state.current === mySeat;
  const { turn } = state;

  // One turn = one seat's n-th go; local picks reset when it changes.
  const turnId = `${state.current}:${current?.turns ?? 0}`;
  const [keep, setKeep] = useState<boolean[]>(() => turn.dice.map(() => false));
  const [preset, setPreset] = useState<(number | null)[]>([null, null]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Real dice: an extra Wunder picked on the Wunder cell, sent with the next entry. */
  const [pendingExtra, setPendingExtra] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rolling, setRolling] = useState<boolean[] | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);

  // Totals stay secret until the host starts the scoreboard; then it opens
  // for everyone who is watching.
  const revealed = scoresRevealed(state);
  const wasRevealed = useRef(revealed);
  useEffect(() => {
    if (revealed && !wasRevealed.current) setScoreOpen(true);
    wasRevealed.current = revealed;
  }, [revealed]);
  const hostName = state.seats.find((s) => s.userId === game.host_id)?.name ?? "Der Gastgeber";

  useEffect(() => {
    setKeep(turn.dice.map(() => false));
    setPreset([null, null]);
    setSelected(null);
    setPendingExtra(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId]);

  // Shake the thrown dice whenever a roll lands, for everyone watching. The
  // roller gets the same roll twice (the API's answer and Realtime), so the
  // stop timer lives outside the effect: a second copy must not cancel it.
  const lastRoll = useRef({ turnId, rolls: turn.rolls });
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (rollTimer.current) clearTimeout(rollTimer.current);
    },
    [],
  );
  useEffect(() => {
    const prev = lastRoll.current;
    lastRoll.current = { turnId, rolls: turn.rolls };
    if (prev.turnId !== turnId || turn.rolls <= prev.rolls) return;
    setRolling(turn.thrown);
    if (rollTimer.current) clearTimeout(rollTimer.current);
    rollTimer.current = setTimeout(() => {
      rollTimer.current = null;
      setRolling(null);
    }, ROLL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId, turn.rolls]);

  const run = async (action: Parameters<typeof callOnline>[0]) => {
    setBusy(true);
    try {
      const result = await callOnline<{ game?: GameRow }>(action);
      if (result.game) accept(result.game);
      return true;
    } catch (error) {
      toast.error(errorText(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const rules = currentRules(state);
  const kind = nextRoll(state);
  const forced = forcedKeeps(state);
  const presetFaces = preset.filter((f): f is number => f !== null);
  const watchedHolds = !myTurn && holds?.turn === turnId && holds.rolls === turn.rolls ? holds : null;
  const shownKeep = myTurn ? keep : (watchedHolds?.keep ?? turn.dice.map(() => false));
  const shownPreset = myTurn ? presetFaces : (watchedHolds?.preset ?? []);
  const faces = turn.dice.map((d, i) => (turn.rolls > 0 ? d : shownPreset[i]));

  const preview = useMemo(() => {
    if (!myTurn || !digital || turn.rolls === 0) return null;
    return Object.fromEntries(fieldKeys(state).map((key) => [key, digitalEntry(state, key)]));
  }, [myTurn, digital, turn.rolls, state]);

  const tappable = useMemo(
    () => new Set(myTurn && !digital ? candidateFields(state, mySeat) : []),
    [myTurn, digital, state, mySeat],
  );

  const toggleKeep = (index: number) => {
    const next = keep.map((k, i) => (i === index ? !k : k));
    setKeep(next);
    setSelected(null);
    sendHolds({ turn: turnId, rolls: turn.rolls, keep: next });
  };

  const changePreset = (slot: number, face: number | null) => {
    const next = preset.map((f, i) => (i === slot ? face : f));
    setPreset(next);
    sendHolds({ turn: turnId, rolls: 0, keep: [], preset: next.filter((f): f is number => f !== null) });
  };

  const roll = async () => {
    setSelected(null);
    const sendKeep = turn.rolls === 0 ? turn.dice.map(() => false) : keep.map((k, i) => k || forced[i]);
    const ok = await run({
      type: "roll",
      gameId: game.id,
      keep: sendKeep,
      ...(turn.rolls === 0 && presetFaces.length > 0 ? { preset: presetFaces } : {}),
    });
    if (ok) sendHolds({ turn: turnId, rolls: turn.rolls + 1, keep });
  };

  const score = async () => {
    if (!selected) return;
    await run({ type: "score", gameId: game.id, field: selected });
  };

  const onCell = (seat: number, field: string) => {
    const filled = state.seats[seat].points[field] !== undefined;
    if (seat === mySeat && myTurn && !filled) {
      if (digital && preview?.[field]) setSelected((s) => (s === field ? null : field));
    }
  };

  const wunder = wunderFieldOf(state.gamemode);
  const asCell = (value: string): Cell => (value === "X" ? "X" : Number(value));

  /** Real dice: the value picker for a cell, as on the paper-style sheet. */
  const cellPicker = (seat: number, field: string): CellPicker | null => {
    if (digital || !running) return null;
    const value = state.seats[seat].points[field];
    const shown = value === undefined ? "" : String(value);
    const options = fieldOptions(state.gamemode, field);
    if (seat === mySeat && myTurn) {
      if (value === undefined && tappable.has(field)) {
        return {
          options,
          value: "",
          onChange: (v) => {
            if (v !== "reset") void run({ type: "score", gameId: game.id, field, value: asCell(v), extraWunder: pendingExtra });
          },
        };
      }
      if (wunder && field === wunder.key && typeof value === "number" && canAddExtraWunder(state)) {
        return {
          options: [value + wunder.base],
          value: pendingExtra ? String(value + wunder.base) : shown,
          resettable: pendingExtra,
          pending: pendingExtra,
          onChange: (v) => setPendingExtra(v !== "reset" && v !== "X"),
        };
      }
    }
    if (isHost && value !== undefined) {
      return {
        options,
        value: shown,
        onChange: (v) => {
          if (v !== "reset" && v !== shown) {
            void run({ type: "correct", gameId: game.id, userId: state.seats[seat].userId, field, value: asCell(v) });
          }
        },
      };
    }
    return null;
  };

  const selectedEntry = selected ? preview?.[selected] : null;
  const selectedInfo =
    selected && selectedEntry
      ? {
          label: labelOf(state, selected),
          text:
            (selectedEntry.value === "X"
              ? "streichen"
              : `+${selectedEntry.doubled ? selectedEntry.value * 2 : selectedEntry.value}`) +
            (selectedEntry.extraWunder ? " · Wunder +50" : ""),
        }
      : null;

  const mission = running ? currentMission(state) : null;

  let line: React.ReactNode;
  if (finished) line = "Spiel vorbei.";
  else if (game.status === "cancelled") line = "Das Spiel wurde abgebrochen.";
  else if (!myTurn) line = <span>{current?.name} ist dran …</span>;
  else if (!digital && pendingExtra) line = <span className="font-semibold">Zusatz-Wunder: wähle jetzt ein passendes Feld.</span>;
  else if (!digital) line = <span className="font-semibold">Du bist dran: würfle und trag ein Feld ein.</span>;
  else if (turn.rolls === 0) line = <span className="font-semibold">Du bist dran!</span>;
  else if (kind === null) line = <span className="font-semibold">Wähle ein Feld.</span>;
  else line = <span>Halte Würfel oder wähle ein Feld.</span>;

  const scored = state.seats.map((s, i) => ({ id: s.userId, name: i === mySeat ? `${s.name} (Du)` : s.name, score: seatScore(state, s) }));
  const ranking = [...scored].sort((a, b) => b.score - a.score);

  const leave = () =>
    setConfirm({
      title: "Spiel verlassen?",
      text: "Deine Spalte bleibt, wie sie ist, und die anderen spielen weiter.",
      run: async () => {
        if (await run({ type: "leave", gameId: game.id })) router.push("/online");
      },
    });

  const reveal = async () => {
    await run({ type: "reveal", gameId: game.id });
  };
  const askReveal = () =>
    running
      ? setConfirm({
          title: "Auswertung jetzt starten?",
          text: "Das Spiel läuft noch. Danach sehen alle die Summen und die Rangliste.",
          run: reveal,
        })
      : void reveal();

  const trophyClass = finished
    ? "rounded-full bg-yellow-400 hover:bg-gray-500 dark:bg-yellow-400 dark:text-black"
    : "rounded-full bg-white";

  return (
    <>
      <PageHeader
        backHref="/online"
        title={config.name}
        right={
          <>
            {revealed ? (
              <ScoreDialog
                players={scored}
                shareConfig={shareConfig(state.gamemode)}
                elapsedMs={state.finishedAt !== null ? state.finishedAt - state.startedAt : null}
                open={scoreOpen}
                onOpenChange={setScoreOpen}
                trigger={
                  <Button variant="outline" className={trophyClass}>
                    🏆
                  </Button>
                }
              />
            ) : isHost ? (
              <Button variant="outline" className={trophyClass} disabled={busy} onClick={askReveal}>
                🏆<span className="hidden sm:block">Auswertung starten</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-full bg-white"
                disabled
                title={`${hostName} startet die Auswertung`}
                aria-label={`Punkte verdeckt, ${hostName} startet die Auswertung`}
              >
                🏆
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full bg-white" aria-label="Menü">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRulesOpen(true)}>
                  <Info /> Regeln
                </DropdownMenuItem>
                {running && mySeat !== -1 && !state.seats[mySeat].left && (
                  <DropdownMenuItem onSelect={leave}>
                    <LogOut /> Spiel verlassen
                  </DropdownMenuItem>
                )}
                {running && isHost && (
                  <>
                    <DropdownMenuSeparator />
                    {state.seats.map((seat, i) =>
                      i === mySeat || seat.left ? null : (
                        <DropdownMenuItem
                          key={seat.userId}
                          onSelect={() =>
                            setConfirm({
                              title: `${seat.name} entfernen?`,
                              text: "Die Spalte bleibt, wie sie ist; die anderen spielen ohne sie weiter.",
                              run: async () => {
                                await run({ type: "remove", gameId: game.id, userId: seat.userId });
                              },
                            })
                          }
                        >
                          <UserX /> {seat.name} entfernen
                        </DropdownMenuItem>
                      ),
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() =>
                        setConfirm({
                          title: "Spiel abbrechen?",
                          text: "Das Spiel endet für alle und kommt nicht in den Verlauf.",
                          run: async () => {
                            if (await run({ type: "cancel", gameId: game.id })) router.push("/online");
                          },
                        })
                      }
                    >
                      <XCircle /> Spiel abbrechen
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 pb-4">

        {mission && (
          <Card className="gap-1 p-3 text-center text-sm">
            <p className="font-bold">
              Mission {mySeat === state.current ? "für dich" : `für ${current?.name}`}: {mission.diceRule}
            </p>
            <p className="text-muted-foreground">{mission.restriction}</p>
          </Card>
        )}

        {finished &&
          (revealed ? (
            <Card className="gap-2 p-4">
              {ranking.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between font-semibold">
                  <span>
                    {MEDALS[i] ?? `${i + 1}.`} {p.name}
                  </span>
                  <span className="tabular-nums">{p.score}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Steht jetzt in deinem Yatzy-Verlauf.</p>
            </Card>
          ) : (
            <Card className="gap-3 p-4 text-center">
              <p className="font-bold">Spiel vorbei!</p>
              {isHost ? (
                <>
                  <p className="text-sm text-muted-foreground">Starte die Auswertung, dann sehen alle die Punkte.</p>
                  <Button
                    className="bg-yellow-400 text-black hover:bg-yellow-300"
                    disabled={busy}
                    onClick={askReveal}
                  >
                    🏆 Auswertung starten
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{hostName} startet gleich die Auswertung …</p>
              )}
            </Card>
          ))}

        <OnlineSheet
          state={state}
          mySeat={mySeat}
          preview={preview}
          tappable={tappable}
          selected={selected}
          correctable={isHost && running && !digital}
          hideTotals={!revealed}
          onCell={onCell}
          picker={cellPicker}
        />

        {running && (digital ? (
          <OnlineDice
            line={line}
            faces={faces}
            kept={shownKeep}
            locked={turn.rolls > 0 ? forced : turn.dice.map(() => false)}
            rolling={rolling}
            canToggle={(i) => myTurn && !busy && canKeep(state, i)}
            onToggle={toggleKeep}
            preset={myTurn && turn.rolls === 0 && rules.presetTwo ? preset : null}
            onPreset={changePreset}
            nextRoll={kind}
            rollsUsed={turn.rolls}
            maxRolls={rules.maxRolls}
            myTurn={myTurn}
            busy={busy}
            onRoll={roll}
            selected={selectedInfo}
            onScore={score}
          />
        ) : (
          <Card className="sticky bottom-2 z-10 p-3 text-sm">{line}</Card>
        ))}
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.text}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Nein
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                const action = confirm;
                setConfirm(null);
                await action?.run();
              }}
            >
              Ja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{config.name}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1 text-sm">
            {(config.information ?? []).map((line) => (
              <p key={line}>{line}</p>
            ))}
            {digital && (
              <p className="mt-2 text-muted-foreground">
                Digitale Würfel: Die App würfelt und rechnet jedes Feld aus. Nach einem Wurf zeigt dein Blatt, was
                jedes Feld bekommen würde.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
