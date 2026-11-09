import { describe, expect, it, beforeEach } from "vitest";
import {
  getFavorites,
  getRecent,
  isNativeApp,
  recordRecent,
  toggleFavorite,
} from "./capacitor";

// Vitest runs in node: no window, no Capacitor bridge. The web fallback
// path uses localStorage, so stub a minimal window.localStorage here.
function installLocalStorageStub() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
}

describe("mobile capacitor helpers (web fallback)", () => {
  beforeEach(() => installLocalStorageStub());

  it("is not a native app in the test/web environment", () => {
    expect(isNativeApp()).toBe(false);
  });

  it("toggles a favorite on then off", async () => {
    expect(await getFavorites()).toEqual([]);
    expect(await toggleFavorite("time-card-calculator")).toEqual(["time-card-calculator"]);
    expect(await getFavorites()).toEqual(["time-card-calculator"]);
    expect(await toggleFavorite("time-card-calculator")).toEqual([]);
  });

  it("records recently used tools newest-first, capped at 5, de-duplicated", async () => {
    for (const slug of ["a", "b", "c", "d", "e", "f"]) await recordRecent(slug);
    expect(await getRecent()).toEqual(["f", "e", "d", "c", "b"]);
    await recordRecent("d");
    expect(await getRecent()).toEqual(["d", "f", "e", "c", "b"]);
  });
});
