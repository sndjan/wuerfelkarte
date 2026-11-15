"use client";

import { ThemeProvider } from "next-themes";

import { EmojiTriggers } from "@/components/emoji/EmojiTriggers";
import { AuthProvider } from "@/lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>{children}</AuthProvider>
      <EmojiTriggers />
    </ThemeProvider>
  );
}
