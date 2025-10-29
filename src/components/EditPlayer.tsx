import {
  ArrowBigLeft,
  ArrowBigRight,
  EllipsisVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";

interface EditPlayerProps {
  playerName: string;
  resetPoints: () => void;
  removePlayer: () => void;
  changeName: (name: string) => void;
  moveToRight: () => void;
  moveToLeft: () => void;
}

export function EditPlayer({
  playerName,
  resetPoints,
  removePlayer,
  changeName,
  moveToRight,
  moveToLeft,
}: EditPlayerProps) {
  const [newPlayerName, setNewPlayerName] = useState<string>(playerName);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setNewPlayerName(playerName);
  }, [playerName]);

  const handleNameChange = () => {
    if (newPlayerName) {
      changeName(newPlayerName);
      setDropdownOpen(false); // Close the dropdown when name is changed
    }
  };

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="z-20 dark:bg-[#212121] dark:hover:bg-[#2a2a2a]"
        >
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Optionen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Pencil />
            <Dialog>
              <DialogTrigger asChild>
                <span>Name bearbeiten</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] top-50">
                <DialogHeader>
                  <DialogTitle>Name bearbeiten</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  Gebe einen neuen Namen für den Spieler ein:
                </DialogDescription>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="username" className="text-right col-span-1">
                    Name
                  </label>
                  <Input
                    id="username"
                    className="col-span-3"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleNameChange}
                    >
                      Speichern
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={resetPoints}>
            <RotateCcw />
            <span>Werte zurücksetzen</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={moveToLeft}>
            <ArrowBigLeft size={16} />
            <span>Nach links verschieben</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={moveToRight}>
            <ArrowBigRight size={16} />
            <span>Nach rechts verschieben</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={removePlayer}>
            <Trash2 />
            <span>Spieler löschen</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
