"use client";

import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAMESPACE } from "@/games/shared/storage";

const DISMISSED_KEY = `${APP_NAMESPACE}:installBannerDismissed`;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === "1") return;

    if (isIos()) {
      setShowIosHint(true);
      setDismissed(false);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt,
      );
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    setDeferredPrompt(null);
  };

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <Card className="mx-4 mb-4 flex items-center gap-3 p-3">
      <span className="text-2xl">📲</span>
      <div className="flex-1 text-sm">
        {showIosHint ? (
          <>
            Installiere Würfelkarte auf deinem Home-Bildschirm: Tippe auf{" "}
            <Share className="inline size-4 align-text-bottom" /> und dann
            &quot;Zum Home-Bildschirm&quot;.
          </>
        ) : (
          "Installiere Würfelkarte auf deinem Startbildschirm für schnellen Zugriff."
        )}
      </div>
      {!showIosHint && (
        <Button size="sm" className="rounded-full" onClick={install}>
          Installieren
        </Button>
      )}
      <button
        type="button"
        aria-label="Hinweis schließen"
        onClick={dismiss}
        className="text-muted-foreground"
      >
        <X size={18} />
      </button>
    </Card>
  );
}
