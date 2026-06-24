"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { EditPlayer } from "./EditPlayer";
import { FTPlayer, FTRoundValue, FTSettings } from "./hooks/useFreeTracking";

interface RoundRowProps {
  roundIndex: number;
  value: FTRoundValue;
  isCurrent: boolean;
  onUpdate: (value: FTRoundValue) => void;
  onCommit: () => void;
}

function RoundRow({
  roundIndex,
  value,
  isCurrent,
  onUpdate,
  onCommit,
}: RoundRowProps) {
  const [localValue, setLocalValue] = useState<string>(
    typeof value === "number" ? value.toString() : "",
  );

  // Sync local state when the external value changes (e.g. reset)
  useEffect(() => {
    if (typeof value === "number") {
      if (parseInt(localValue, 10) !== value) {
        setLocalValue(value.toString());
      }
    } else if (value === null) {
      if (localValue !== "" && localValue !== "-") {
        setLocalValue("");
      }
    }
    // Intentionally omit localValue from deps — only sync on external value change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    if (raw === "") {
      onUpdate(null);
    } else if (raw !== "-") {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) onUpdate(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const sameRoundInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(`[data-round-index="${roundIndex}"]`)
      );
      const currentIdx = sameRoundInputs.indexOf(e.currentTarget);
      const next = sameRoundInputs[currentIdx + 1];
      if (next) {
        next.focus();
      } else {
        const nextRoundInputs = document.querySelectorAll<HTMLInputElement>(
          `[data-round-index="${roundIndex + 1}"]`
        );
        nextRoundInputs[0]?.focus();
      }
    }
  };

  const handleBlur = () => {
    if (typeof value === "number") {
      setLocalValue(value.toString());
    } else {
      setLocalValue("");
    }
    if (isCurrent && value !== null) onCommit();
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      data-round-index={roundIndex}
      placeholder={`Runde ${roundIndex + 1}`}
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="h-9 text-center text-sm"
    />
  );
}

interface FreeTrackingCardProps {
  player: FTPlayer;
  currentRoundIndex: number;
  settings: FTSettings;
  onUpdateRound: (roundIndex: number, value: FTRoundValue) => void;
  onCurrentRoundFilled: () => void;
  onResetRounds: () => void;
  onRemovePlayer: () => void;
  onChangeName: (name: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

const FreeTrackingCard: React.FC<FreeTrackingCardProps> = ({
  player,
  currentRoundIndex,
  settings,
  onUpdateRound,
  onCurrentRoundFilled,
  onResetRounds,
  onRemovePlayer,
  onChangeName,
  onMoveLeft,
  onMoveRight,
}) => {
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const roundsRef = useRef<HTMLDivElement>(null);

  const targetReached =
    settings.targetScore !== null && player.score >= settings.targetScore;

  // Scroll rounds container to bottom when a new round is appended
  useEffect(() => {
    if (roundsRef.current) {
      roundsRef.current.scrollTop = roundsRef.current.scrollHeight;
    }
  }, [player.rounds.length]);

  return (
    <Card className="p-4 flex flex-col items-center relative">
      {/* Header */}
      <div className="flex flex-row justify-between w-full items-center mb-3">
        <button
          className="z-20 font-bold bg-white dark:bg-[#171717] px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#212121] transition-colors cursor-pointer"
          onClick={() => setNameDialogOpen(true)}
        >
          {player.name}
        </button>
        <EditPlayer
          playerName={player.name}
          resetPoints={onResetRounds}
          removePlayer={onRemovePlayer}
          changeName={onChangeName}
          moveToRight={onMoveRight}
          moveToLeft={onMoveLeft}
          nameDialogOpen={nameDialogOpen}
          onNameDialogOpenChange={setNameDialogOpen}
        />
      </div>

      {/* Round rows — scrollable */}
      <div
        ref={roundsRef}
        className="w-full flex flex-col gap-1 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        {player.rounds.map((value, roundIndex) => (
          <RoundRow
            key={roundIndex}
            roundIndex={roundIndex}
            value={value}
            isCurrent={roundIndex === currentRoundIndex}
            onUpdate={(val) => onUpdateRound(roundIndex, val)}
            onCommit={onCurrentRoundFilled}
          />
        ))}
      </div>

      {/* Total */}
      <div
        className={`mt-3 w-full flex justify-between items-center px-3 py-2 rounded-md font-bold ${
          targetReached
            ? "bg-orange-100 dark:bg-orange-900/30 "
            : "bg-white dark:bg-[#171717]"
        }`}
      >
        <span>Gesamt</span>
        <span className="flex items-center gap-1">
          {player.score}
          {targetReached && <span>👑</span>}
        </span>
      </div>
    </Card>
  );
};

export default FreeTrackingCard;
