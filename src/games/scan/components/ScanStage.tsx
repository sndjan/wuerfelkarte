"use client";

/** One sweep of the scan line; the page waits for at least one, however quick the answer. */
export const SWEEP_MS = 1300;

/**
 * The photo while it is being read: a green scan line runs over it, tinting
 * what it has passed, until the answer is back.
 */
export function ScanStage({ photo }: { photo: string }) {
  return (
    <div className="flex h-[440px] w-[320px] items-center justify-center overflow-hidden rounded-[20px] bg-surface-sunken">
      <style>{`
        @keyframes wk-scan-sweep { 0% { top: 0% } 85%, 100% { top: 100% } }
        @keyframes wk-scan-wash { 0% { height: 0% } 85%, 100% { height: 100% } }
        .wk-scan-line { animation: wk-scan-sweep ${SWEEP_MS}ms cubic-bezier(.45,.05,.55,.95) infinite; }
        .wk-scan-wash { animation: wk-scan-wash ${SWEEP_MS}ms cubic-bezier(.45,.05,.55,.95) infinite; }
        @media (prefers-reduced-motion: reduce) { .wk-scan-line, .wk-scan-wash { display: none; } }
      `}</style>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="block max-h-[440px] max-w-[320px]" />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="wk-scan-wash absolute inset-x-0 top-0 bg-brand/15" />
          <div className="wk-scan-line absolute -inset-x-2 h-[3px] bg-brand shadow-[0_0_18px_6px_color-mix(in_srgb,var(--brand)_45%,transparent)]" />
        </div>
      </div>
    </div>
  );
}
