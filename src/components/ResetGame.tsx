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

interface ResetGameProps {
  resetAllPoints: () => void;
  children: React.ReactNode;
}

export function ResetGame({ resetAllPoints, children }: ResetGameProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] top-50">
        <DialogHeader>
          <DialogTitle>Punkte zurücksetzen</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Möchtest du wirklich alle Punkte zurücksetzen?
        </DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              type="submit"
              variant="destructive"
              onClick={() => resetAllPoints()}
            >
              Zurücksetzen
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ResetGame;
