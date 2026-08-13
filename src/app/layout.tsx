import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { Providers } from "./providers";
import { StorageMigration } from "@/games/shared/StorageMigration";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: { template: "%s | Würfelkarte", default: "Würfelkarte" },
  description:
    "Würfelkarte – Das digitale Würfel-Erlebnis. Spiele verschiedene Würfelspiel-Varianten, tracke Punkte und genieße spannende Runden mit Freunden!",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Würfelkarte",
    statusBarStyle: "default",
  },
  other: {
    // Next only emits the newer "mobile-web-app-capable"; pre-17.4 iOS
    // Safari still needs the "apple-" prefixed tag for standalone mode.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#12201A" },
  ],
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
      className={`h-full ${baloo2.variable} ${nunito.variable}`}
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
          <StorageMigration />
          {children}
          <SpeedInsights />
          <Analytics />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
