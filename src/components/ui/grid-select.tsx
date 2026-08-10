"use client";

import { ChevronDownIcon, RotateCcw } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GridSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<number | string>;
  label: string;
  disabled?: boolean;
  className?: string;
}

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  columns: number;
}

// [minimum panel width in px, number of grid columns at/above that width]
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

// Matches the grid's size-10 circles + gap-2 + py-3, and the action row's
// size="sm" buttons + p-3 pt-0 — close enough to decide above/below placement
// without needing to measure the rendered panel.
const CIRCLE_SIZE = 40;
const GRID_GAP = 8;
const GRID_VERTICAL_PADDING = 24;
const ACTIONS_ROW_HEIGHT = 44;
const VIEWPORT_MARGIN = 8;

function estimatePanelHeight(optionCount: number, columns: number) {
  const rows = Math.ceil(optionCount / columns);
  const gridHeight =
    rows * CIRCLE_SIZE + Math.max(rows - 1, 0) * GRID_GAP + GRID_VERTICAL_PADDING;
  return gridHeight + ACTIONS_ROW_HEIGHT;
}

function GridSelect({
  value,
  onValueChange,
  options,
  label,
  disabled,
  className,
}: GridSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // A single option gets its own full-width row instead of a lone circle.
      const columns =
        options.length === 1 ? 1 : columnsForWidth(rect.width);
      const estimatedHeight = estimatePanelHeight(options.length, columns);
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - VIEWPORT_MARGIN;
      const placeAbove = estimatedHeight > spaceBelow && spaceAbove > spaceBelow;

      if (placeAbove) {
        const maxHeight = spaceAbove;
        const top =
          rect.top - Math.min(estimatedHeight, maxHeight) - 4;
        setPosition({
          top: Math.max(VIEWPORT_MARGIN, top),
          left: rect.left,
          width: rect.width,
          maxHeight,
          columns,
        });
      } else {
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
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

  const select = (next: string) => {
    onValueChange(next);
    setOpen(false);
  };

  const displayValue = value === "" ? null : value === "X" ? "❌" : value;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "border-input flex w-fit items-center justify-between gap-2 rounded-full border bg-transparent px-4 py-4 text-base shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span
          className={cn(
            "truncate",
            displayValue === null && "text-muted-foreground",
          )}
        >
          {displayValue ?? label}
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
                // Fixed-width columns + space-between: circles sit flush with
                // the panel edges and share the leftover space evenly.
                gridTemplateColumns:
                  options.length === 1
                    ? "minmax(0, 1fr)"
                    : `repeat(${position.columns}, ${CIRCLE_SIZE}px)`,
              }}
            >
              {options.map((opt, idx) => {
                const optValue = String(opt);
                const selected = value === optValue;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(optValue)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-full font-medium transition-colors",
                      options.length === 1 ? "w-full" : "w-10",
                      options.length > 1 && optValue.length >= 3
                        ? "text-xs"
                        : "text-sm",
                      selected
                        ? "bg-green-800 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
                        : "bg-green-50 text-green-900 hover:bg-green-100 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 p-3 pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => select("reset")}
              >
                <RotateCcw />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => select("X")}
              >
                ❌{" "}
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export { GridSelect };
