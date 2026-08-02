"use client";

import { useEffect, useState } from "react";
import { loadWizardMatches } from "../storage";
import { StoredWizardMatch } from "../types";

export function useWizardMatchHistory(): StoredWizardMatch[] {
  const [matches, setMatches] = useState<StoredWizardMatch[]>([]);

  useEffect(() => {
    setMatches(loadWizardMatches());
  }, []);

  return matches;
}
