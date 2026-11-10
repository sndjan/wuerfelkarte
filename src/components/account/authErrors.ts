import type { AuthError } from "@supabase/supabase-js";

export const authErrorMessage = (error: AuthError): string => {
  if (error.status === 429) return "Zu viele Versuche. Kurz warten.";
  if (/expired|invalid/i.test(error.message)) return "Code falsch oder abgelaufen.";
  if (/email/i.test(error.message) && /valid/i.test(error.message)) return "Ungültige E-Mail.";
  return "Hat nicht geklappt.";
};
