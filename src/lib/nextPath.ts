/**
 * Where to go after signing in. Only paths inside the app are allowed, so a
 * crafted link can't send people to another site.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/konto"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  // Browsers read a backslash as a slash and drop tabs and line breaks, so
  // "/\\evil.example" and "/\t/evil.example" would both leave the site.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const base = "https://app.invalid";
    if (new URL(value, base).origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return value;
}
