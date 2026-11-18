"use client";

import { Share } from "lucide-react";
import { toast } from "sonner";

/** Shares the page's address, or copies it where the browser cannot share. */
export function ShareButton({ title }: { title: string }) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link kopiert");
    } catch (error) {
      // Closing the share sheet is no error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Teilen hat nicht geklappt");
    }
  };

  return (
    <button type="button" className="wk-iconbtn" aria-label="Teilen" onClick={share}>
      <Share className="size-5" aria-hidden="true" />
    </button>
  );
}
