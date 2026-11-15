"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { isGuest, useAuth } from "@/lib/auth";
import { AccountView } from "./AccountView";
import { SignInForm } from "./SignInForm";

function AccountContent() {
  const { user, loading, available } = useAuth();
  const linkFailed = useSearchParams().get("error") === "link";

  if (loading) {
    return (
      <div className="flex justify-center pt-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-label="Lädt" />
      </div>
    );
  }
  if (!available) {
    return (
      <p className="pt-16 text-center text-sm text-muted-foreground">
        Konten gerade nicht verfügbar.
      </p>
    );
  }
  if (user && !isGuest(user)) return <AccountView user={user} />;
  return (
    <>
      {user && (
        <p className="mt-6 rounded-[20px] bg-card p-4 text-sm leading-relaxed">
          Du spielst gerade als Gast. Mit einem Konto landen deine Spiele auf
          all deinen Geräten, und du kannst selbst Online-Spiele eröffnen.
        </p>
      )}
      <SignInForm linkFailed={linkFailed} />
    </>
  );
}

export function AccountPage() {
  return (
    <div className="min-h-full bg-background">
      <PageHeader title="Konto" />
      <div className="mx-auto max-w-sm px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <Suspense>
          <AccountContent />
        </Suspense>
      </div>
    </div>
  );
}
