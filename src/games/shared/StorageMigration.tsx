"use client";

import { useEffect } from "react";

import { migrateLegacyStorage } from "./migrations";

/**
 * Brings pre-refactor localStorage onto the current keys, once, before any
 * game reads from it. Rendered high in the root layout and draws nothing.
 */
export function StorageMigration() {
  useEffect(() => {
    migrateLegacyStorage();
  }, []);

  return null;
}
