/**
 * Shared factories for the freelancer test suites. Test-only helpers —
 * not imported by production code.
 */
import { DEFAULT_APP_SETTINGS, type AppSettings } from "./settings";
import { FreelancerStore, createMemoryFileAdapter, type StoreFileAdapter } from "./store";
import type { Client, TimeEntry } from "./models";

export function testSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_APP_SETTINGS, ...overrides };
}

export async function openTestStore(adapter?: StoreFileAdapter) {
  const mem = (adapter ?? createMemoryFileAdapter()) as ReturnType<typeof createMemoryFileAdapter>;
  const { store, load } = await FreelancerStore.open(mem);
  return { store, load, adapter: mem };
}

export async function makeClient(
  store: FreelancerStore,
  overrides: Partial<Omit<Client, "id" | "createdAt" | "updatedAt">> = {}
): Promise<Client> {
  return store.createClient({
    name: "Acme Corp",
    currency: "USD",
    defaultRateCents: 5000,
    paymentTermsDays: 14,
    archived: false,
    ...overrides,
  });
}

export type EntrySpec = {
  date: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  mode?: "times" | "direct";
  directHours?: number;
  endsNextDay?: boolean;
};

/** One 9-hour paid day: 09:00–18:30 with a 30-minute break. */
export const NINE_HOUR_DAY: EntrySpec = { date: "2026-11-02", startTime: "09:00", endTime: "18:30", breakMinutes: 30 };

/** Mon–Fri 2026-11-02…06, 9 paid hours each = 45h. */
export const WEEK_45H: EntrySpec[] = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"].map((date) => ({
  ...NINE_HOUR_DAY,
  date,
}));

export async function addEntries(
  store: FreelancerStore,
  clientId: string,
  specs: EntrySpec[],
  settings: AppSettings = testSettings(),
  projectId?: string
): Promise<TimeEntry[]> {
  const out: TimeEntry[] = [];
  for (const spec of specs) {
    out.push(
      await store.createEntry(
        {
          clientId,
          projectId,
          date: spec.date,
          startTime: spec.startTime ?? "09:00",
          endTime: spec.endTime ?? "18:30",
          endsNextDay: spec.endsNextDay ?? false,
          breakMinutes: spec.breakMinutes ?? 30,
          mode: spec.mode ?? "times",
          directHours: spec.directHours,
          origin: "manual",
        },
        settings
      )
    );
  }
  return out;
}
