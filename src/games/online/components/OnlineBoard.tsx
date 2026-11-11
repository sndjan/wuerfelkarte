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
import PlayerCard from "@/games/yatzy/components/PlayerCard";
import { gamemodes } from "@/games/yatzy/gamemodes";
import { hasStoredCompactMode, loadCompactMode } from "@/games/yatzy/storage";
import { cn } from "@/lib/utils";
import { callOnline, OnlineError } from "../client";
import { wunderFieldOf } from "../dice";
import {
  canAddExtraWunder,
  canKeep,
  candidateFields,
  currentMission,
  currentRules,
  digitalEntry,
  fieldKeys,
  fieldStatus,
  forcedKeeps,
  nextRoll,
  scoresRevealed,
  seatScore,
  type Cell,
  type OnlineState,
} from "../engine";
import type { LiveHolds, LiveRoll } from "../hooks/useOnline";
import type { GameRow } from "../types";
import { OnlineDice } from "./OnlineDice";

const errorText = (error: unknown) => (error instanceof OnlineError ? error.message : "Hat nicht geklappt.");

type Confirm = { title: string; text: string; run: () => Promise<void> };

const labelOf = (state: OnlineState, field: string) =>
  gamemodes[state.gamemode].fields.find((f) => f.key === field)?.label ?? field;

const MEDALS = ["🥇", "🥈", "🥉"];

/** A roll shakes at least this long, and never longer than the second figure. */
const MIN_SHAKE_MS = 350;
const MAX_SHAKE_MS = 8000;

/** The running (or finished) online game. */
export function OnlineBoard({
  game,
  userId,
  holds,
  sendHolds,
  liveRoll,
  sendRolling,
  accept,
}: {
  game: GameRow;
  userId: string;
  holds: LiveHolds | null;
  sendHolds: (holds: LiveHolds) => void;
  liveRoll: LiveRoll | null;
  sendRolling: (roll: Omit<LiveRoll, "at">) => void;
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
  const [keep, setKeep] = useState<boolean[]>(() => turn.held ?? turn.dice.map(() => false));
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

  // The dice shake from the moment the roller taps (for the others from the
  // moment the "rolling" broadcast arrives) until the result is in, at least
  // MIN_SHAKE_MS so it reads as a roll. The roller gets each result twice
  // (the API's answer and Realtime), so the timer lives in a ref: a second
  // copy must not cancel it.
  const lastRoll = useRef({ turnId, rolls: turn.rolls });
  const shakeStart = useRef<number | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopShake = (after: number) => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => {
      shakeTimer.current = null;
      shakeStart.current = null;
      setRolling(null);
    }, after);
  };
  const startShake = (dice: boolean[]) => {
    setRolling(dice);
    shakeStart.current = Date.now();
    // Should the result never come, stop anyway.
    stopShake(MAX_SHAKE_MS);
  };
  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    },
    [],
  );
  useEffect(() => {
    const prev = lastRoll.current;
    lastRoll.current = { turnId, rolls: turn.rolls };
    if (prev.turnId !== turnId || turn.rolls <= prev.rolls) return;
    setRolling(turn.thrown);
    const shaking = shakeStart.current;
    if (shaking === null) shakeStart.current = Date.now();
    stopShake(shaking === null ? ROLL_MS : Math.max(0, MIN_SHAKE_MS - (Date.now() - shaking)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId, turn.rolls]);
  // Someone else tapped "Würfeln": shake their dice before the result arrives.
  useEffect(() => {
    if (!liveRoll || liveRoll.turn !== turnId || liveRoll.rolls !== turn.rolls) return;
    if (Date.now() - liveRoll.at > MAX_SHAKE_MS) return;
    startShake(liveRoll.shake);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRoll]);

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
  // Others see the live picks between rolls, and what the server kept
  // through the last roll otherwise, so held dice never flick back.
  const shownKeep = myTurn ? keep : (watchedHolds?.keep ?? turn.held ?? turn.dice.map(() => false));
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
    const shake =
      turn.rolls === 0 ? turn.dice.map((_, i) => i >= presetFaces.length) : sendKeep.map((k) => !k);
    startShake(shake);
    sendRolling({ turn: turnId, rolls: turn.rolls, shake });
    const ok = await run({
      type: "roll",
      gameId: game.id,
      keep: sendKeep,
      ...(turn.rolls === 0 && presetFaces.length > 0 ? { preset: presetFaces } : {}),
    });
    if (ok) sendHolds({ turn: turnId, rolls: turn.rolls + 1, keep });
    else stopShake(0);
  };

  const score = async () => {
    if (!selected) return;
    await run({ type: "score", gameId: game.id, field: selected });
  };

  const wunder = wunderFieldOf(state.gamemode);
  const isBattle = state.gamemode === "Battle";

  /** Real dice: whether a cell opens the value picker for this account. */
  const editable = (seatIndex: number, key: string) => {
    if (digital || !running) return false;
    const value = state.seats[seatIndex].points[key];
    if (seatIndex === mySeat && myTurn) {
      if (value === undefined && tappable.has(key)) return true;
      if (wunder && key === wunder.key && typeof value === "number" && canAddExtraWunder(state)) return true;
    }
    return isHost && value !== undefined;
  };

  /** A value picked on a card (real dice): an entry, an extra Wunder or the host's correction. */
  const pickValue = (seatIndex: number, points: Record<string, number | "X">) => {
    const [key, picked] = Object.entries(points)[0] ?? [];
    if (key === undefined || picked === undefined) return;
    const seat = state.seats[seatIndex];
    const value = seat.points[key];
    if (seatIndex === mySeat && myTurn) {
      if (value === undefined) {
        if (picked !== 0) void run({ type: "score", gameId: game.id, field: key, value: picked as Cell, extraWunder: pendingExtra });
        return;
      }
      if (wunder && key === wunder.key && canAddExtraWunder(state)) {
        setPendingExtra(typeof picked === "number" && typeof value === "number" && picked > value);
        return;
      }
    }
    if (isHost && value !== undefined && picked !== 0 && picked !== value) {
      void run({ type: "correct", gameId: game.id, userId: seat.userId, field: key, value: picked as Cell });
    }
  };

  /** Fields that are not a picker: read-only values, or the digital dice's "+12" to tap. */
  const fieldFor = (seatIndex: number, field: { key: string; label: string }, cellClass: string) => {
    if (editable(seatIndex, field.key)) return undefined;
    const value = state.seats[seatIndex].points[field.key];
    const pill = cn(
      "flex w-full items-center gap-2 rounded-full border border-input shadow-xs transition-colors",
      compact ? "px-3 py-1.5 text-sm" : "px-4 py-1.5 text-base",
      cellClass,
    );
    const entry = seatIndex === mySeat ? preview?.[field.key] : null;
    if (value === undefined && entry) {
      const points = entry.value === "X" ? null : entry.doubled ? entry.value * 2 : entry.value;
      return (
        <button
          type="button"
          onClick={() => setSelected((s) => (s === field.key ? null : field.key))}
          className={cn(pill, "text-left", selected === field.key && "ring-2 ring-brand-accent")}
        >
          <span className={cn("shrink-0 font-bold tabular-nums", points ? "text-brand-accent" : "opacity-40")}>
            {points ? `+${points}` : "❌"}
          </span>
          <span className="truncate text-muted-foreground">{field.label}</span>
        </button>
      );
    }
    return (
      <div className={pill}>
        <span className={cn("truncate", value === undefined && "text-muted-foreground")}>
          {value === undefined ? field.label : value === "X" ? "❌" : value}
        </span>
      </div>
    );
  };

  // Cards in turn order starting with the own one, as around a table.
  const order = state.seats
    .map((_, i) => i)
    .sort((a, b) => {
      const from = mySeat === -1 ? 0 : mySeat;
      const n = state.seats.length;
      return ((a - from + n) % n) - ((b - from + n) % n);
    });

  // Compact cards on phones, as in the normal game, unless chosen otherwise there.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    setCompact(hasStoredCompactMode() ? loadCompactMode() : window.innerWidth < 640);
  }, []);

  // Bring the card of the player on turn into view when the turn passes.
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    const container = document.getElementById("online-cards");
    const card = cardRefs.current[current?.userId ?? ""];
    if (!container || !card || !running) return;
    container.scrollTo({
      left: card.offsetLeft - container.offsetLeft - container.clientWidth / 2 + card.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [turnId, running, current?.userId]);

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

      <div className="flex w-full flex-1 flex-col gap-3 pb-4">
        {mission && (
          <Card className="mx-4 gap-1 p-3 text-center text-sm">
            <p className="font-bold">
              Mission {mySeat === state.current ? "für dich" : `für ${current?.name}`}: {mission.diceRule}
            </p>
            <p className="text-muted-foreground">{mission.restriction}</p>
          </Card>
        )}

        {finished &&
          (revealed ? (
            <Card className="mx-4 gap-2 p-4">
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
            <Card className="mx-4 gap-3 p-4 text-center">
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

        <div
          id="online-cards"
          className="no-scrollbar snap-x snap-mandatory overflow-x-auto px-4"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex flex-row gap-4 py-1">
            {order.map((seatIndex) => {
              const seat = state.seats[seatIndex];
              const points = Object.fromEntries(
                fieldKeys(state).map((key) => [key, seat.points[key] ?? 0]),
              ) as Record<string, number | "X">;
              if (seatIndex === mySeat && pendingExtra && wunder) {
                points[wunder.key] = (points[wunder.key] as number) + wunder.base;
              }
              const onTurn = running && seatIndex === state.current;
              return (
                <div
                  key={seat.userId}
                  ref={(el) => {
                    cardRefs.current[seat.userId] = el;
                  }}
                  className={cn(
                    "snap-center flex-1 basis-0 min-w-[150px] rounded-xl",
                    onTurn && "ring-2 ring-brand-accent",
                    seat.left && "opacity-60",
                  )}
                >
                  <PlayerCard
                    playerName={seat.name}
                    playerPoints={points}
                    updatePoints={(p) => pickValue(seatIndex, p)}
                    resetPoints={() => {}}
                    removePlayer={() => {}}
                    changeName={() => {}}
                    moveToRight={() => {}}
                    moveToLeft={() => {}}
                    gamemode={state.gamemode}
                    hideMenu
                    badge={seat.left ? "weg" : onTurn ? "🎲 dran" : undefined}
                    battleFieldStatus={
                      isBattle
                        ? Object.fromEntries(
                            fieldKeys(state).map((key) => {
                              const status = fieldStatus(state, seatIndex, key);
                              return [key, status === "filled" ? "open" : status];
                            }),
                          )
                        : undefined
                    }
                    doubledFields={new Set(seat.doubled)}
                    compact={compact}
                    renderField={(field, cellClass) => fieldFor(seatIndex, field, cellClass)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {running && (digital ? (
          <div className="mx-auto w-full max-w-md px-4">
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
          </div>
        ) : (
          <Card className="sticky bottom-2 z-10 mx-4 p-3 text-sm">{line}</Card>
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
                Digitale Würfel: Die App würfelt und rechnet jedes Feld aus. Nach einem Wurf zeigt deine Karte, was
                jedes Feld bekommen würde.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
