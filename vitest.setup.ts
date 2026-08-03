import { webcrypto } from "node:crypto";

// Node 18 has no global `crypto`; browsers do. The app calls
// `crypto.randomUUID()` for player and match ids.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}
