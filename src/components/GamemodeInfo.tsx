import { Info } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface GamemodeInfoProps {
  gamemodeInfo: string[];
}

export function GamemodeInfo({ gamemodeInfo }: GamemodeInfoProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Info />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] ">
        <DialogHeader>
          <DialogTitle>Infos zum Spielmodus</DialogTitle>
        </DialogHeader>
        {gamemodeInfo.length > 0 && (
          <DialogDescription>{gamemodeInfo[0]}</DialogDescription>
        )}
        <div className="grid grid-cols-1 gap-4">
          {gamemodeInfo.slice(1).map((info, index) => (
            <p key={index} className="text-sm ">
              {info}
            </p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GamemodeInfo;
