import { createGameClient } from "@/lib/supabase/client-game";
import { useState } from "react";
import AnimatedScoreDiagram from "./AnimatedScoreDiagram";
import { gamemodes } from "./gamemodes/gamemodes";
import { Player } from "./hooks/types";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Share } from "./Share";

const PROFILE_ACTIVE = process.env.NEXT_PUBLIC_PROFILE_ACTIVE === "true";

interface ScoringProps {
  players: Player[];
  gamemode: keyof typeof gamemodes;
  children: React.ReactNode;
}

export function Scoring({
  players,
  gamemode,
  children,
}: ScoringProps) {
  const [saveStatus, setSaveStatus] = useState<
    null | "success" | "error" | "saving"
  >(null);

  const saveMatchLocally = () => {
    // Check if any player has a non-zero score
    const hasValidScores = players.some(p => p.score > 0);
    if (!hasValidScores) {
      return;
    }

    const lastMatches = localStorage.getItem("lastMatches");
    const lastMatchesData = lastMatches ? JSON.parse(lastMatches) : [];
    const lastMatchTime = lastMatchesData[lastMatchesData.length - 1]?.timestamp 
      ? new Date(lastMatchesData[lastMatchesData.length - 1].timestamp).getTime() 
      : 0;
    const now = Date.now();
    const timeDiffInSeconds = (now - lastMatchTime) / 1000;

    // Don't save if last match was saved within the last 2 minutes
    if (timeDiffInSeconds < 120) {
      return;
    }

    const newMatch = { players, gamemode, timestamp: new Date().toISOString() };
    lastMatchesData.push(newMatch);
  
    localStorage.setItem("lastMatches", JSON.stringify(lastMatchesData));
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      saveMatchLocally();
    }
  };

  async function handleSaveMatch() {
    setSaveStatus("saving");
    
     const supabase = createGameClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaveStatus("error");
      return;
    }
    const { error } = await supabase.from("matches").insert([
      {
        user_id: user.id,
        summary: {
          players: players.map((p) => ({
            name: p.name,
            score: p.score,
          })),
        },
        gamemode,
        start_time: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // Example: 10 min ago
        end_time: new Date().toISOString(),
      },
    ]);
    if (error) {
      setSaveStatus("error");
    } else {
      setSaveStatus("success");
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Punkteauswertung</DialogTitle>
        </DialogHeader>
        <DialogDescription>Siehe wer gewonnen hat</DialogDescription>
        <div className="mt-4">
          <AnimatedScoreDiagram players={players} />
        </div>
        <div className="mt-4 flex gap-2 justify-end items-center">
          <Share gamemode={gamemode} players={players} />
        </div>
        {PROFILE_ACTIVE && (
          <div className="mt-6 flex flex-col gap-2 items-center">
            <Button
              onClick={handleSaveMatch}
              disabled={saveStatus === "saving" || saveStatus === "success"}
            >
              {saveStatus === "saving"
                ? "Speichern..."
                : saveStatus === "success"
                ? "Gespeichert!"
                : "Match speichern"}
            </Button>
            {saveStatus === "error" && (
              <span className="text-red-500 text-sm">
                Fehler beim Speichern.
              </span>
            )}
            {saveStatus === "success" && (
              <span className="text-green-600 text-sm">
                Match erfolgreich gespeichert!
              </span>
            )}
          </div>
        )}{" "}
      </DialogContent>
    </Dialog>
  );
}
