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
} from "./ui/dialog";
import { Input } from "./ui/input";

interface EditPlayerProps {
  playerName: string;
  resetPoints: () => void;
  removePlayer: () => void;
  changeName: (name: string) => void;
  moveToRight: () => void;
  moveToLeft: () => void;
  nameDialogOpen?: boolean;
  onNameDialogOpenChange?: (open: boolean) => void;
}

export function EditPlayer({
  playerName,
  resetPoints,
  removePlayer,
  changeName,
  moveToRight,
  moveToLeft,
  nameDialogOpen,
  onNameDialogOpenChange,
}: EditPlayerProps) {
  const [newPlayerName, setNewPlayerName] = useState<string>(playerName);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);

  const isDialogOpen =
    nameDialogOpen !== undefined ? nameDialogOpen : internalDialogOpen;
  const setIsDialogOpen = (open: boolean) => {
    setInternalDialogOpen(open);
    onNameDialogOpenChange?.(open);
  };

  useEffect(() => {
    setNewPlayerName(playerName);
  }, [playerName]);

  const handleNameChange = () => {
    if (newPlayerName) {
      changeName(newPlayerName);
      setIsDialogOpen(false);
      setDropdownOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="z-20">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Optionen</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setDropdownOpen(false);
                setIsDialogOpen(true);
              }}
            >
              <Pencil />
              <span>Name bearbeiten</span>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              onKeyDown={(e) => e.key === "Enter" && handleNameChange()}
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
    </>
  );
}
