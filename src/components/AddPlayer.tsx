import { useState } from "react";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";

interface AddPlayerProps {
  addPlayer: (name: string) => void;
  children: React.ReactNode;
}

export function AddPlayer({ addPlayer, children }: AddPlayerProps) {
  const [playerName, setPlayerName] = useState("");

  const handleAddPlayer = () => {
    if (playerName.trim()) {
      addPlayer(playerName.trim());
      setPlayerName("");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] top-50">
        <DialogHeader>
          <DialogTitle>Spieler hinzufügen</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Gebe einen Namen für einen neuen Spieler ein:
        </DialogDescription>
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="username" className="text-right col-span-1">
            Name
          </label>
          <Input
            id="username"
            className="col-span-3"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddPlayer();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleAddPlayer}>
            Hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddPlayer;
