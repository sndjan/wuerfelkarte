"use client";

import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Loader2,
  LogOut,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import {
  getSyncStatus,
  subscribeSyncStatus,
  syncNow,
  type SyncStatus,
} from "@/lib/sync/client";
import { cn } from "@/lib/utils";
import { PlayerLinks } from "./PlayerLinks";

const BALOO = "font-[family-name:var(--font-baloo)]";

function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState(getSyncStatus);
  useEffect(() => subscribeSyncStatus(setStatus), []);
  return status;
}

const timeAgo = (at: number) => {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  return new Date(at).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function SyncLine({ status }: { status: SyncStatus }) {
  switch (status.state) {
    case "syncing":
      return (
        <>
          <Loader2 className="size-4 animate-spin" /> Synchronisiert …
        </>
      );
    case "unavailable":
      return (
        <>
          <CloudOff className="size-4" /> Sync nicht eingerichtet.
        </>
      );
    case "error":
      return (
        <>
          <AlertTriangle className="size-4 text-destructive" /> Offline. Wird
          nachgeholt.
        </>
      );
    case "pending":
      return (
        <>
          <Loader2 className="size-4 animate-spin" /> Gleich synchronisiert.
        </>
      );
    case "synced":
      return (
        <>
          <CheckCircle2 className="size-4 text-brand-accent" /> Synchronisiert
          {status.lastSyncedAt !== null && ` · ${timeAgo(status.lastSyncedAt)}`}
        </>
      );
    default:
      return null;
  }
}

export function AccountView({ user }: { user: User }) {
  const status = useSyncStatus();
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const signOut = async () => {
    setSigningOut(true);
    // Sends whatever is still waiting, so nothing played here is missing on the other devices.
    await syncNow();
    await getSupabase()?.auth.signOut();
    setSigningOut(false);
  };

  const deleteAccount = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setDeleting(false);
      setDeleteError("Löschen fehlgeschlagen.");
      return;
    }
    // The user is gone on the server; only the local session is left to drop.
    await supabase.auth.signOut({ scope: "local" });
    setDeleting(false);
    setDeleteOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col items-center gap-2 pt-6 text-center">
        <span
          className={cn(
            BALOO,
            "flex size-20 items-center justify-center rounded-[24px] bg-brand-accent text-4xl font-extrabold text-white shadow-sm",
          )}
          aria-hidden="true"
        >
          {(user.email ?? "?").charAt(0).toUpperCase()}
        </span>
        <h2 className={cn(BALOO, "mt-2 text-2xl font-extrabold")}>
          Angemeldet
        </h2>
        <p className="break-all text-sm text-muted-foreground">{user.email}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p
            className="flex min-h-9 flex-wrap items-center gap-1.5 text-sm"
            role="status"
          >
            <SyncLine status={status} />
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            aria-label="Jetzt synchronisieren"
            disabled={status.state === "syncing"}
            onClick={() => void syncNow()}
          >
            <RefreshCw />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Spieler, Verlauf und Spiele auf all deinen Geräten.
        </p>
      </section>

      <PlayerLinks user={user} />

      <Button
        type="button"
        variant="outline"
        className="h-12 rounded-xl text-base font-bold"
        disabled={signingOut}
        onClick={() => void signOut()}
      >
        {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
        Abmelden
      </Button>
      <p className="-mt-2 text-center text-xs text-muted-foreground">
        Spiele bleiben auf diesem Gerät.
      </p>

      {deleteOpen ? (
        <section className="mt-6 flex flex-col gap-3 rounded-[20px] border-2 border-destructive/40 bg-card p-5">
          <h3 className={cn(BALOO, "text-lg font-extrabold")}>
            Konto löschen?
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Alles auf dem Server wird gelöscht. Deine Geräte behalten ihre
            Spiele.
          </p>
          {deleteError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {deleteError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteAccount()}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Endgültig löschen
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Abbrechen
            </Button>
          </div>
        </section>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="mt-6 self-center text-destructive hover:text-destructive"
          onClick={() => {
            setDeleteError(null);
            setDeleteOpen(true);
          }}
        >
          <Trash2 />
          Konto löschen
        </Button>
      )}
    </div>
  );
}
