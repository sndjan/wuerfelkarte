import type { AuthError } from "@supabase/supabase-js";

export const authErrorMessage = (error: AuthError): string => {
  if (error.status === 429) return "Zu viele Versuche. Bitte kurz warten.";
  if (/expired|invalid/i.test(error.message)) return "Code falsch oder abgelaufen.";
  if (/email/i.test(error.message) && /valid/i.test(error.message)) return "Bitte eine gültige E-Mail eingeben.";
  return "Das hat nicht geklappt. Bitte erneut versuchen.";
};
