import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Würfelkarte - Tracker für Würfelspiele",
    short_name: "Würfelkarte",
    description:
      "Das digitale Würfel-Erlebnis. Spiele verschiedene Würfelspiel-Varianten, tracke Punkte und genieße spannende Runden mit Freunden!",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["games", "utilities"],
    background_color: "#F1F7F2",
    theme_color: "#F1F7F2",
    icons: [
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
