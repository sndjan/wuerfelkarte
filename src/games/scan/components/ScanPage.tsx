"use client";

import { Camera, Check, Printer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Emoji } from "@/components/emoji/Emoji";
import { loadRoster } from "@/games/shared/roster";
import { yatzyStorage } from "@/games/yatzy/storage";
import {
  formatCell,
  invalidCells,
  parseCell,
  playersFromRead,
  ranking,
  SHEET_FIELDS,
  sheetScore,
  toPoints,
  upperSum,
  type CellName,
  type ReadSheet,
  type SheetPlayer,
} from "../sheet";

const MESSAGES: Record<string, string> = {
  "not set up": "Das Auslesen ist noch nicht eingerichtet.",
  limit: "Für heute sind alle Scans aufgebraucht. Morgen geht es weiter.",
  busy: "Gerade ist viel los. Versuch es gleich nochmal.",
  "bad image": "Mit diesem Bild hat es nicht geklappt. Nimm bitte ein neues Foto auf.",
  "too big": "Das Bild ist zu groß.",
  unreadable: "Das Blatt war nicht lesbar. Fotografiere es gerade von oben, gut beleuchtet.",
  "not a sheet": "Auf dem Foto ist kein Würfelkarte-Block zu sehen.",
};

/** Long side of the photo sent to the reader: enough for handwriting, small to upload. */
const MAX_SIDE = 1600;

async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

type Phase = "start" | "reading" | "review" | "saved";

/** /scan: photo of the paper Kniffelblock in, checked sheet and ranking out. */
export function ScanPage() {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("start");
  const [photo, setPhoto] = useState<string | null>(null);
  const [players, setPlayers] = useState<SheetPlayer[]>([]);
  const [unclear, setUnclear] = useState<Set<string>>(new Set());
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function read(file: File) {
    setError(null);
    setPhase("reading");
    try {
      const image = await shrink(file);
      setPhoto(image);
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; sheet?: ReadSheet; left?: number };
      if (!response.ok || !body.sheet) throw new Error(MESSAGES[body.error ?? ""] ?? "Hat nicht geklappt.");
      const read = playersFromRead(body.sheet);
      if (read.length === 0) throw new Error("Auf dem Blatt stehen noch keine Punkte.");
      setPlayers(read);
      setUnclear(new Set(body.sheet.unclear ?? []));
      setLeft(body.left ?? null);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Keine Verbindung.");
      setPhase("start");
    }
  }

  function edit(index: number, cell: CellName, raw: string) {
    const field = SHEET_FIELDS.find((f) => f.cell === cell)!;
    setPlayers((all) =>
      all.map((p, i) => (i === index ? { ...p, values: { ...p.values, [cell]: parseCell(field, raw) } } : p)),
    );
    setUnclear((u) => {
      const next = new Set(u);
      next.delete(`${index + 1}:${cell}`);
      return next;
    });
  }

  function rename(index: number, name: string) {
    setPlayers((all) => all.map((p, i) => (i === index ? { ...p, name: name.slice(0, 24) } : p)));
  }

  function save() {
    const roster = loadRoster();
    const emojiOf = (name: string) =>
      roster.find((r) => r.name.toLowerCase() === name.trim().toLowerCase())?.emoji;
    yatzyStorage.saveMatch({
      id: crypto.randomUUID(),
      gamemode: "Wunder",
      timestamp: new Date().toISOString(),
      players: players.map((p) => {
        const emoji = emojiOf(p.name);
        return { name: p.name.trim(), ...(emoji ? { emoji } : {}), score: sheetScore(p), points: toPoints(p) };
      }),
    });
    toast.success("Im Kniffel-Verlauf gespeichert.");
    setPhase("saved");
  }

  const blocked = players.some((p) => invalidCells(p).length > 0 || !p.name.trim());
  const ranked = ranking(players);

  return (
    <div className="wk min-h-full bg-background">
      <PageHeader title="Papierblock" />
      <main className="wk-page max-w-md">
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void read(file);
          }}
        />

        {(phase === "start" || phase === "reading") && (
          <>
            <section className="wk-card">
              <h2 className="wk-card-title">Auf Papier spielen, hier auswerten</h2>
              <p className="wk-hint">
                Spielt auf dem Würfelkarte-Block, fotografiert das Blatt am Ende von oben, alle vier schwarzen Ecken im
                Bild. Die App liest die Zahlen, rechnet Bonus und Summen und zeigt, wer gewonnen hat.
              </p>
              <button
                type="button"
                className="wk-btn wk-btn-brand wk-btn-lg wk-btn-block"
                disabled={phase === "reading"}
                onClick={() => input.current?.click()}
              >
                <Camera className="size-5" aria-hidden="true" />
                {phase === "reading" ? "Wird gelesen …" : "Blatt fotografieren"}
              </button>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            </section>
            <a href="/kniffelblock.pdf" target="_blank" rel="noopener" className="wk-listrow">
              <Printer className="size-6 text-ink-muted" aria-hidden="true" />
              <div className="wk-listrow-body">
                <p className="wk-listrow-title">Block ausdrucken</p>
                <p className="wk-listrow-sub">PDF, 4 Blätter (A6) auf einer A4-Seite</p>
              </div>
            </a>
            <section className="wk-section">
              <h2 className="wk-overline">Beim Eintragen</h2>
              <ul className="wk-hint list-disc space-y-1 pl-5">
                <li>Eine Zahl pro Feld, dunkler Stift.</li>
                <li>Gestrichen: X ins Feld.</li>
                <li>Full House, Straßen, Kniffel: Zahl oder Haken.</li>
                <li>Summen sind freiwillig, die App rechnet selbst.</li>
              </ul>
            </section>
          </>
        )}

        {phase === "review" && (
          <>
            <section className="wk-section">
              <h2 className="wk-overline">Gelesen – bitte prüfen</h2>
              <p className="wk-hint">
                Tippe ein Feld an, um es zu ändern. Rot geht so nicht, gelb war schwer zu lesen.
                {left !== null && ` Heute noch ${left} Scans.`}
              </p>
              {photo && (
                <details className="wk-card p-2">
                  <summary className="cursor-pointer px-2 text-sm font-bold">Foto ansehen</summary>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="Das fotografierte Blatt" className="mt-2 w-full rounded-md" />
                </details>
              )}
              <ReviewTable players={players} unclear={unclear} onEdit={edit} onRename={rename} />
            </section>

            <section className="wk-section">
              <h2 className="wk-overline">Rangliste</h2>
              {ranked.map(({ player, index, score, place }) => (
                <div key={index} className={`wk-listrow ${place === 1 ? "wk-card-accent" : ""}`}>
                  <span className="wk-num w-6 text-center font-display text-xl font-extrabold">{place}.</span>
                  <div className="wk-listrow-body">
                    <p className="wk-listrow-title">{player.name || "?"}</p>
                    <p className="wk-listrow-sub">
                      oben {upperSum(player).sum}
                      {upperSum(player).bonus ? " + 35 Bonus" : ""}
                      {player.writtenSum !== null && player.writtenSum !== score && ` · auf dem Blatt ${player.writtenSum}`}
                    </p>
                  </div>
                  <span className="wk-num font-display text-2xl font-extrabold">{score}</span>
                </div>
              ))}
            </section>

            <div className="flex flex-col gap-2">
              <button type="button" className="wk-btn wk-btn-primary wk-btn-lg wk-btn-block" disabled={blocked} onClick={save}>
                <Check className="size-5" aria-hidden="true" />
                Im Verlauf speichern
              </button>
              {blocked && <p className="wk-caption text-center">Erst alle roten Felder und Namen korrigieren.</p>}
              <button type="button" className="wk-btn wk-btn-ghost wk-btn-block" onClick={() => input.current?.click()}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Neu fotografieren
              </button>
            </div>
          </>
        )}

        {phase === "saved" && (
          <section className="wk-card items-center text-center">
            <h2 className="wk-card-title">
              <Emoji e="🏆" /> {ranked[0]?.player.name} gewinnt mit {ranked[0]?.score}
            </h2>
            <p className="wk-hint">Das Spiel steht jetzt im Kniffel-Verlauf und zählt in der Statistik.</p>
            <div className="flex w-full flex-col gap-2">
              <Link href="/verlauf" className="wk-btn wk-btn-primary wk-btn-block">
                Zum Verlauf
              </Link>
              <button
                type="button"
                className="wk-btn wk-btn-outline wk-btn-block"
                onClick={() => {
                  setPlayers([]);
                  setPhoto(null);
                  setPhase("start");
                }}
              >
                Nächstes Blatt
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ReviewTable({
  players,
  unclear,
  onEdit,
  onRename,
}: {
  players: SheetPlayer[];
  unclear: Set<string>;
  onEdit: (index: number, cell: CellName, raw: string) => void;
  onRename: (index: number, name: string) => void;
}) {
  const bad = players.map((p) => new Set(invalidCells(p)));
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-24" />
            {players.map((p, i) => (
              <th key={i} className="p-1">
                <input
                  value={p.name}
                  onChange={(e) => onRename(i, e.target.value)}
                  aria-label={`Name Spalte ${i + 1}`}
                  className={`w-full min-w-14 rounded-md border bg-surface px-1 py-1 text-center font-bold ${p.name.trim() ? "border-border" : "border-danger"}`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHEET_FIELDS.map((field, row) => (
            <tr key={field.cell} className={row === 6 ? "border-t-2 border-border-strong" : ""}>
              <th scope="row" className="px-2 py-0.5 text-left font-semibold whitespace-nowrap">
                {field.label}
              </th>
              {players.map((p, i) => (
                <td key={i} className="p-0.5">
                  <CellInput
                    value={formatCell(p.values[field.cell])}
                    invalid={bad[i].has(field.cell)}
                    unsure={unclear.has(`${i + 1}:${field.cell}`)}
                    label={`${field.label}, ${p.name}`}
                    onChange={(raw) => onEdit(i, field.cell, raw)}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-border-strong font-extrabold">
            <th scope="row" className="px-2 py-1 text-left">Summe</th>
            {players.map((p, i) => (
              <td key={i} className="wk-num py-1 text-center">{sheetScore(p)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Keeps the typed text while editing, so "1" on the way to "12" is not flagged and reformatted. */
function CellInput({
  value,
  invalid,
  unsure,
  label,
  onChange,
}: {
  value: string;
  invalid: boolean;
  unsure: boolean;
  label: string;
  onChange: (raw: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const tone = invalid ? "border-danger bg-danger-soft" : unsure ? "border-gold bg-surface" : "border-transparent";
  return (
    <input
      value={draft ?? value}
      inputMode="text"
      aria-label={label}
      aria-invalid={invalid}
      onFocus={(e) => {
        setDraft(value);
        e.target.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => setDraft(null)}
      className={`wk-num h-8 w-full min-w-12 rounded-md border-2 text-center font-semibold ${tone}`}
    />
  );
}
