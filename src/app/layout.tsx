import type { Metadata } from "next";
import { Providers } from "../../providers/providers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: { template: "%s | Würfelkarte", default: "Würfelkarte" },
  description:
    "Würfelkarte – Das digitale Würfel-Erlebnis. Spiele verschiedene Würfelspiel-Varianten, tracke Punkte und genieße spannende Runden mit Freunden!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ overflow: "hidden", width: "100%" }}
      className="h-full"
    >
      <body
        style={{
          height: "100%",
          width: "100%",
          position: "fixed",
          overflowY: "scroll",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
