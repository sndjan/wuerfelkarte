"use client";

import { ChevronDownIcon, RotateCcw } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NumberSelectProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  max: number;
  label: string;
  className?: string;
}

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  columns: number;
}

const COLUMN_BREAKPOINTS: Array<[number, number]> = [
  [0, 3],
  [280, 4],
  [400, 5],
  [520, 6],
];

function columnsForWidth(width: number) {
  let columns = COLUMN_BREAKPOINTS[0][1];
  for (const [minWidth, cols] of COLUMN_BREAKPOINTS) {
    if (width >= minWidth) columns = cols;
  }
  return columns;
}

const CIRCLE_SIZE = 40;
const GRID_GAP = 8;
const GRID_VERTICAL_PADDING = 24;
const ACTIONS_ROW_HEIGHT = 44;
const VIEWPORT_MARGIN = 8;
/**
 * The trigger is a compact pill (just wide enough for one number), so the
 * panel can't inherit its width like `GridSelect` does — it needs its own
 * comfortable size, centered on the trigger and clamped to the viewport.
 */
const PANEL_WIDTH = 300;

function estimatePanelHeight(optionCount: number, columns: number) {
  const rows = Math.ceil(optionCount / columns);
  const gridHeight =
    rows * CIRCLE_SIZE + Math.max(rows - 1, 0) * GRID_GAP + GRID_VERTICAL_PADDING;
  return gridHeight + ACTIONS_ROW_HEIGHT;
}

/** Number-only variant of `GridSelect` for Wizard bids/tricks: 0..max, no "X" action. */
function NumberSelect({
  value,
  onValueChange,
  max,
  label,
  className,
}: NumberSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const options = Array.from({ length: max + 1 }, (_, i) => i);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * VIEWPORT_MARGIN);
      const idealLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.min(
        Math.max(idealLeft, VIEWPORT_MARGIN),
        window.innerWidth - VIEWPORT_MARGIN - width,
      );

      const columns = options.length === 1 ? 1 : columnsForWidth(width);
      const estimatedHeight = estimatePanelHeight(options.length, columns);
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - VIEWPORT_MARGIN;
      const placeAbove = estimatedHeight > spaceBelow && spaceAbove > spaceBelow;

      if (placeAbove) {
        const maxHeight = spaceAbove;
        const top = rect.top - Math.min(estimatedHeight, maxHeight) - 4;
        setPosition({
          top: Math.max(VIEWPORT_MARGIN, top),
          left,
          width,
          maxHeight,
          columns,
        });
      } else {
        setPosition({
          top: rect.bottom + 4,
          left,
          width,
          maxHeight: spaceBelow,
          columns,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const select = (next: number | null) => {
    onValueChange(next);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "border-input flex w-fit items-center justify-between gap-2 rounded-full border bg-transparent px-4 py-4 text-base shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className,
        )}
      >
        <span
          className={cn("truncate", value === null && "text-muted-foreground")}
        >
          {value === null ? label : value}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="bg-popover text-popover-foreground z-50 overflow-y-auto rounded-xl border shadow-md"
          >
            <div
              className="grid justify-between gap-2 p-3"
              style={{
                gridTemplateColumns:
                  options.length === 1
                    ? "minmax(0, 1fr)"
                    : `repeat(${position.columns}, ${CIRCLE_SIZE}px)`,
              }}
            >
              {options.map((opt) => {
                const selected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(opt)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-full font-medium transition-colors",
                      options.length === 1 ? "w-full" : "w-10",
                      "text-sm",
                      selected
                        ? "bg-green-800 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
                        : "bg-green-50 text-green-900 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-950/60",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 p-3 pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => select(null)}
              >
                <RotateCcw />
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export { NumberSelect };
