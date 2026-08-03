import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ResetPointsDialogProps {
  onConfirm: () => void;
  children: React.ReactNode;
}

export function ResetPointsDialog({ onConfirm, children }: ResetPointsDialogProps) {
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
              onClick={onConfirm}
            >
              Zurücksetzen
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ResetPointsDialog;
