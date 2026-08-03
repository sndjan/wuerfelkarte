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
import { useState } from "react";
import { PlayerIdentityDialog } from "@/games/shared/components/PlayerIdentityDialog";
import { Button } from "./ui/button";

interface EditPlayerProps {
  playerName: string;
  playerEmoji?: string;
  takenNames?: string[];
  resetPoints: () => void;
  removePlayer: () => void;
  changeName: (name: string, emoji?: string) => void;
  moveToRight: () => void;
  moveToLeft: () => void;
  nameDialogOpen?: boolean;
  onNameDialogOpenChange?: (open: boolean) => void;
}

export function EditPlayer({
  playerName,
  playerEmoji,
  takenNames,
  resetPoints,
  removePlayer,
  changeName,
  moveToRight,
  moveToLeft,
  nameDialogOpen,
  onNameDialogOpenChange,
}: EditPlayerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);

  const isDialogOpen =
    nameDialogOpen !== undefined ? nameDialogOpen : internalDialogOpen;
  const setIsDialogOpen = (open: boolean) => {
    setInternalDialogOpen(open);
    onNameDialogOpenChange?.(open);
  };

  const handleApply = (name: string, emoji?: string) => {
    changeName(name, emoji);
    setDropdownOpen(false);
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
              <span>Spieler bearbeiten</span>
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

      <PlayerIdentityDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        playerName={playerName}
        playerEmoji={playerEmoji}
        takenNames={takenNames}
        onApply={handleApply}
      />
    </>
  );
}
