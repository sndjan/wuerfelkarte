import { beforeEach, describe, expect, it } from "vitest";
import { readJSON, setWriteListener, writeJSON, removeKey } from "@/games/shared/storage";
import { SYNC_META_KEY, linkDevice, markDirty, runSync, unlinkDevice, type SyncRemote } from "./engine";
import { isSyncedKey } from "./keys";

/** The server side: one row per key, stamped on every write. */
class FakeServer {
  rows = new Map<string, { value: unknown; updatedAt: string }>();
  private clock = Date.parse("2026-11-10T12:00:00Z");

  remote(): SyncRemote {
    return {
      pull: async (since) =>
        [...this.rows.entries()]
          .filter(([, row]) => since === null || row.updatedAt > since)
          .sort(([, a], [, b]) => a.updatedAt.localeCompare(b.updatedAt))
          .map(([key, row]) => ({ key, ...row })),
      push: async (rows) =>
        rows.map(({ key, value }) => {
          const updatedAt = new Date((this.clock += 1000)).toISOString();
          this.rows.set(key, { value: structuredClone(value), updatedAt });
          return { key, updatedAt };
        }),
    };
  }
}

/** Each device is a localStorage snapshot swapped in and out of the one test storage. */
class Device {
  private data = new Map<string, string>();

  use<T>(fn: () => T): T {
    localStorage.clear();
    this.data.forEach((value, key) => localStorage.setItem(key, value));
    try {
      return fn();
    } finally {
      this.save();
    }
  }

  async useAsync<T>(fn: () => Promise<T>): Promise<T> {
    localStorage.clear();
    this.data.forEach((value, key) => localStorage.setItem(key, value));
    try {
      return await fn();
    } finally {
      this.save();
    }
  }

  private save() {
    this.data = new Map();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      this.data.set(key, localStorage.getItem(key)!);
    }
  }
}

const USER = "user-1";
const match = (id: string, day: number) => ({ id, timestamp: `2026-11-0${day}T10:00:00.000Z`, players: [] });

let server: FakeServer;

beforeEach(() => {
  server = new FakeServer();
  // What the browser client does: every app write marks its key dirty.
  setWriteListener((key) => isSyncedKey(key) && markDirty(key));
  return () => setWriteListener(null);
});

const sync = (device: Device) => device.useAsync(() => runSync(server.remote(), USER));

describe("runSync", () => {
  it("uploads what was played before signing in and brings it to a second device", async () => {
    const phone = new Device();
    const tablet = new Device();
    phone.use(() => {
      writeJSON("yatzy:matches", [match("a", 1)]);
      writeJSON("quiz:submission", { token: "secret" });
      linkDevice(USER);
    });
    await sync(phone);
    expect([...server.rows.keys()]).toEqual(["yatzy:matches"]);

    tablet.use(() => linkDevice(USER));
    const { changed } = await sync(tablet);
    expect(changed).toBe(true);
    expect(tablet.use(() => readJSON("yatzy:matches", []))).toEqual([match("a", 1)]);
  });

  it("combines histories both devices had before signing in", async () => {
    const phone = new Device();
    const tablet = new Device();
    phone.use(() => {
      writeJSON("wizard:matches", [match("p", 1)]);
      writeJSON("wuerfelkarte:roster", [{ id: "1", name: "Anna" }]);
      linkDevice(USER);
    });
    tablet.use(() => {
      writeJSON("wizard:matches", [match("t", 2)]);
      writeJSON("wuerfelkarte:roster", [{ id: "2", name: "Anna" }, { id: "3", name: "Ben" }]);
      linkDevice(USER);
    });
    await sync(phone);
    await sync(tablet);
    await sync(phone);

    for (const device of [phone, tablet]) {
      device.use(() => {
        expect(readJSON<{ id: string }[]>("wizard:matches", []).map((m) => m.id)).toEqual(["p", "t"]);
        expect(readJSON<{ name: string }[]>("wuerfelkarte:roster", []).map((p) => p.name)).toEqual([
          "Anna",
          "Ben",
        ]);
      });
    }
  });

  it("does not resurrect a match this device removed after uploading it", async () => {
    const phone = new Device();
    phone.use(() => {
      writeJSON("cabo:matches", [match("a", 1), match("b", 2)]);
      linkDevice(USER);
    });
    await sync(phone);
    phone.use(() => writeJSON("cabo:matches", [match("a", 1)]));
    await sync(phone);
    await sync(phone);
    expect(phone.use(() => readJSON<{ id: string }[]>("cabo:matches", []).map((m) => m.id))).toEqual(["a"]);
    expect(server.rows.get("cabo:matches")?.value).toEqual([match("a", 1)]);
  });

  it("passes on a finished game, so the other device stops offering it", async () => {
    const phone = new Device();
    const tablet = new Device();
    phone.use(() => {
      writeJSON("flip7:game", { round: 2 });
      linkDevice(USER);
    });
    await sync(phone);
    tablet.use(() => linkDevice(USER));
    await sync(tablet);
    expect(tablet.use(() => readJSON("flip7:game", null))).toEqual({ round: 2 });

    phone.use(() => removeKey("flip7:game"));
    await sync(phone);
    await sync(tablet);
    expect(tablet.use(() => localStorage.getItem("flip7:game"))).toBeNull();
  });

  it("keeps changes dirty when the upload fails", async () => {
    const phone = new Device();
    phone.use(() => {
      writeJSON("darts:settings", { legs: 3 });
      linkDevice(USER);
    });
    const broken: SyncRemote = {
      pull: async () => [],
      push: async () => {
        throw new Error("offline");
      },
    };
    await expect(phone.useAsync(() => runSync(broken, USER))).rejects.toThrow("offline");
    await sync(phone);
    expect(server.rows.get("darts:settings")?.value).toEqual({ legs: 3 });
  });

  it("starts over when another account signs in on the device", async () => {
    const phone = new Device();
    phone.use(() => {
      writeJSON("yatzy:matches", [match("a", 1)]);
      linkDevice(USER);
    });
    await sync(phone);
    phone.use(() => {
      unlinkDevice();
      expect(localStorage.getItem(SYNC_META_KEY)).toBeNull();
      linkDevice("user-2");
      expect(readJSON<{ dirty: string[] }>(SYNC_META_KEY, { dirty: [] }).dirty).toEqual(["yatzy:matches"]);
    });
  });
});
