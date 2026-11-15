"use client";

import { Emoji } from "@/components/emoji/Emoji";
import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Loader2,
  LogOut,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
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
import { OwnStats } from "./OwnStats";
import { useSelfPlayer } from "./useSelfPlayer";

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
  const self = useSelfPlayer();
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const signOut = async () => {
    setSigningOut(true);
    // Sends whatever is still waiting, so nothing played here is missing on the other devices.
    await syncNow();
    // Only this device; the default (global) would sign out every other device too.
    await getSupabase()?.auth.signOut({ scope: "local" });
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
      <section className="wk-card flex-row items-center gap-4">
        <Link href="/konto/charakter" className="wkx-avatar wkx-avatar-lg" aria-label="Charakter ändern">
          {self?.emoji ? <Emoji e={self.emoji} trigger={self.emoji} /> : (user.email ?? "?").charAt(0).toUpperCase()}
          <span className="wkx-avatar-edit" aria-hidden="true">
            <Pencil className="size-4" />
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className={cn(BALOO, "truncate text-2xl leading-8 font-extrabold tracking-tight")}>
            {self?.name ?? "Angemeldet"}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="flex min-h-5 flex-wrap items-center gap-1 text-xs text-muted-foreground" role="status">
            <SyncLine status={status} />
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Jetzt synchronisieren"
          disabled={status.state === "syncing"}
          onClick={() => void syncNow()}
        >
          <RefreshCw />
        </Button>
      </section>

      <OwnStats name={self?.name ?? null} />

      <PlayerLinks user={user} />

      <Appearance />

      <Button
        type="button"
        variant="outline"
        className="h-12 text-base font-bold"
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
        <section className="mt-6 flex flex-col gap-3 rounded-[20px] border-2 border-danger/40 bg-card p-5">
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

/** Hell, Dunkel or like the device — moved here from every page header. */
function Appearance() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options = [
    ["light", "Hell"],
    ["dark", "Dunkel"],
    ["system", "Wie Gerät"],
  ] as const;
  return (
    <section className="wk-section">
      <h3 className="wk-overline">Darstellung</h3>
      <div className="wk-segment" role="tablist" aria-label="Darstellung">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mounted && theme === value}
            onClick={() => setTheme(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
