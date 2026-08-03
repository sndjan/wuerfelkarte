import { webcrypto } from "node:crypto";
import { beforeEach } from "vitest";

// Node 18 has no global `crypto`; browsers do. The app calls
// `crypto.randomUUID()` for player and match ids.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

/**
 * Minimal in-memory localStorage plus a `window` global, so the storage layer
 * — which is SSR-guarded with `typeof window === "undefined"` — is exercised
 * for real instead of silently no-opping under Node.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, "localStorage", { value: storage });
if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", { value: globalThis });
}

// Every test starts from an empty browser.
beforeEach(() => storage.clear());
