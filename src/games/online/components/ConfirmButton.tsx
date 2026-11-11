"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** A destructive button that asks once more in place, like the account page. */
export function ConfirmButton({
  label,
  confirm,
  disabled,
  onConfirm,
}: {
  label: string;
  confirm: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant="ghost" className="text-destructive" disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <span>{confirm}</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        Ja
      </Button>
      <Button variant="outline" size="sm" onClick={() => setAsking(false)}>
        Nein
      </Button>
    </div>
  );
}
