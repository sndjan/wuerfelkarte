"use client";

import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { authErrorMessage } from "./authErrors";

const RESEND_SECONDS = 30;
// Must match Authentication → Providers → Email → "Email OTP Length" in Supabase.
const CODE_LENGTH = 6;

const BALOO = "font-[family-name:var(--font-baloo)]";

/**
 * Email first, then a link or a code from the mail. The link suits a browser,
 * the code an installed app, where the link would open the browser instead.
 */
export function SignInForm({ linkFailed }: { linkFailed?: boolean }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    linkFailed ? "Link ungültig. Fordere einen neuen an." : null,
  );
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(
      () => setResendIn((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendLink = async () => {
    const supabase = getSupabase();
    if (!supabase || sending) return;
    setError(null);
    setSending(true);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: new URL(
          "/konto/callback",
          window.location.origin,
        ).toString(),
      },
    });
    setSending(false);
    if (sendError) {
      setError(authErrorMessage(sendError));
      return;
    }
    setCode("");
    setStep("code");
    setResendIn(RESEND_SECONDS);
  };

  const verifyCode = async (token: string) => {
    const supabase = getSupabase();
    if (!supabase || verifying) return;
    setError(null);
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setVerifying(false);
    // On success the auth listener switches the page to the account view.
    if (verifyError) setError(authErrorMessage(verifyError));
  };

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void verifyCode(digits);
  };

  return (
    <div className="flex flex-col">
      {step === "code" && (
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
          className="-ml-2 flex size-10 items-center justify-center rounded-full transition-transform active:scale-95"
          aria-label="Andere E-Mail verwenden"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}

      <section className="flex flex-col items-center gap-2 pt-6 text-center">
        <span
          className="flex size-20 items-center justify-center rounded-[24px] bg-card text-4xl shadow-sm"
          aria-hidden="true"
        >
          {step === "code" ? "📬" : "🎲"}
        </span>
        <h2 className={cn(BALOO, "mt-2 text-2xl font-extrabold")}>
          {step === "code" ? "Schau in dein Postfach" : "Anmelden"}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step === "code" ? (
            <>
              Link an <b className="text-foreground">{email.trim()}</b>{" "}
              gesendet.
              <span className="mt-1 block text-xs">
                Nichts da? Spam-Ordner prüfen.
              </span>
            </>
          ) : (
            <>Deine Spiele auf all deinen Geräten.</>
          )}
        </p>
      </section>

      {step === "email" ? (
        <form
          className="mt-8 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendLink();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            E-Mail
            <Input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="du@beispiel.de"
              className="h-12 rounded-xl bg-card font-normal"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={sending}
            className="h-12 rounded-xl text-base font-bold"
          >
            {sending ? <Loader2 className="animate-spin" /> : <Mail />}
            {sending ? "Sendet …" : "Link senden"}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Kein Passwort. Neu? Das Konto entsteht automatisch.
          </p>
        </form>
      ) : (
        <section className="mt-8 flex flex-col gap-3">
          <label htmlFor="otp" className="text-center text-sm font-bold">
            Oder Code eingeben
          </label>
          <input
            id="otp"
            ref={codeInputRef}
            value={code}
            onChange={(event) => handleCodeChange(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={"·".repeat(CODE_LENGTH)}
            aria-invalid={Boolean(error)}
            disabled={verifying}
            className={cn(
              BALOO,
              "h-16 rounded-2xl border bg-card text-center text-3xl font-extrabold tracking-[0.45em] outline-none transition-colors placeholder:text-muted-foreground focus:border-2 focus:border-brand-accent",
              error ? "border-destructive" : "border-input",
            )}
          />
          {error && (
            <p
              role="alert"
              className="text-center text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
          {verifying ? (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Prüft …
            </p>
          ) : (
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Für die App auf dem Homescreen.
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={resendIn > 0 || sending}
            onClick={() => void sendLink()}
            className="mt-4 self-center"
          >
            {resendIn > 0
              ? `Erneut in 0:${String(resendIn).padStart(2, "0")}`
              : "Erneut senden"}
          </Button>
        </section>
      )}
    </div>
  );
}
