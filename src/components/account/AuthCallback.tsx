"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { getSupabase } from "@/lib/supabase";
import { safeNextPath } from "@/lib/nextPath";

/**
 * Target of the sign-in link in the email. Handles both link styles:
 * - token_hash: works in any browser (the template in supabase/templates)
 * - code: Supabase's default link, only works in the browser that asked for it
 */
function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice; a link can only be used once.
    if (handled.current) return;
    handled.current = true;

    const next = safeNextPath(params.get("next"));
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as EmailOtpType | null;
    const supabase = getSupabase();

    const verify = async () => {
      if (!supabase) return new Error("Keine Konten");
      if (tokenHash && type) return (await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
      if (code) return (await supabase.auth.exchangeCodeForSession(code)).error;
      return new Error("Link unvollständig");
    };

    void verify().then((error) => router.replace(error ? "/konto?error=link" : next));
  }, [params, router]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">Du wirst angemeldet …</p>
    </div>
  );
}

export function AuthCallback() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
