import type { Metadata } from "next";

import { PageHeader } from "@/components/common/PageHeader";
import { Emoji } from "@/components/emoji/Emoji";

export const metadata: Metadata = {
  title: "Lizenzen",
  description: "Woher die Emoji und die Software der Würfelkarte stammen und unter welchen Lizenzen sie stehen.",
};

const link = "font-semibold text-brand-accent underline underline-offset-2";

/** Credits for everything the app ships that others made. */
export default function LizenzenPage() {
  return (
    <div className="min-h-full bg-background">
      <PageHeader backHref="/" title="Lizenzen" />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10 md:px-8">
        <section className="wk-card gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Emoji e="🎲" label="" /> Emoji
          </h2>
          <p className="text-sm">
            Alle Emoji der Würfelkarte stammen aus <b>Noto Emoji</b> von Google und sehen deshalb
            auf iPhone, Android und am Computer gleich aus. Google steht in keiner Verbindung zur
            Würfelkarte.
          </p>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-bold">Animierte Emoji</p>
            <p>
              Noto Emoji Animation, © Google LLC, lizenziert unter{" "}
              <a className={link} href="https://creativecommons.org/licenses/by/4.0/deed.de" rel="license noopener" target="_blank">
                CC BY 4.0
              </a>
              . Quelle:{" "}
              <a className={link} href="https://googlefonts.github.io/noto-emoji-animation/" rel="noopener" target="_blank">
                googlefonts.github.io/noto-emoji-animation
              </a>
              . Unverändert übernommen.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-bold">Emoji-Bilder</p>
            <p>
              Noto Emoji, © Google LLC, lizenziert unter der{" "}
              <a className={link} href="/emoji/LICENSE-Apache-2.0.txt" rel="license" target="_blank">
                Apache License 2.0
              </a>
              . Quelle:{" "}
              <a className={link} href="https://github.com/googlefonts/noto-emoji" rel="noopener" target="_blank">
                github.com/googlefonts/noto-emoji
              </a>
              . Unverändert übernommen.
            </p>
          </div>
        </section>
        <section className="wk-card gap-3">
          <h2 className="text-lg font-bold">Software</h2>
          <p className="text-sm">
            Die Animationen spielt{" "}
            <a className={link} href="https://github.com/airbnb/lottie-web" rel="noopener" target="_blank">
              lottie-web
            </a>{" "}
            ab, © Airbnb, MIT-Lizenz.
          </p>
        </section>
      </main>
    </div>
  );
}
