/**
 * Freelancer Time & Invoice — native store (M1).
 *
 * SETTINGS OWNERSHIP TABLE (M1 detail (a) — final, single source of truth):
 *
 * | Data                              | Lives in                          | Why |
 * | --------------------------------- | --------------------------------- | --- |
 * | Clients, projects, time entries,  | Single versioned JSON document    | One atomic write must cover an    |
 * | invoices, invoice sequence        | `freelancer-store.json`           | invoice + counter + entry marks   |
 * | counter (this file)               | (Filesystem, Directory.Data)      | (checklist §1 D-1, §3 I-2).       |
 * | App settings (default currency,   | Capacitor Preferences key         | A settings reset must never touch |
 * | default rate, overtime defaults,  | `triangletech-freelancer-settings`| record data (checklist P-6).      |
 * | payment terms, invoice prefix,    | (see settings.ts)                 |                                     |
 * | company name, language)           |                                   |                                     |
 * | Report branding (user company     | Capacitor Preferences key         | Same key + JSON shape as the      |
 * | name + logo for PDF headers)      | `triangletech-report-branding`    | website's report-branding module; |
 * |                                   | (see settings.ts)                 | Preferences on native,            |
 * |                                   |                                   | localStorage fallback on web.     |
 * | Last-known Pro entitlement +      | Inside this document (schema v4,   | Pro status is durable user state, |
 * | rewarded-ad grant count (M4)      | `proEntitlement`, `rewardGrants`) | not a setting: a settings reset   |
 * |                                   |                                   | must never wipe it (P-6), and the |
 * |                                   |                                   | cap checks in createInvoice /     |
 * |                                   |                                   | createClient run inside the same  |
 * |                                   |                                   | transact() as the creation (see   |
 * |                                   |                                   | entitlements.ts for the rules).   |
 * | Corruption / recovery event log   | In-memory + best-effort append to | A read-path log must never rewrite|
 * |                                   | `freelancer-store-events.json`    | the live store document.          |
 *
 * There is no second copy of any of the above anywhere else in the app.
 * The website's localStorage helpers in `src/lib/tools/report-branding.ts`
 * are NOT used by the app. WebView localStorage is NOT the source of
 * truth for records.
 *
 * ON-DEVICE LOCATION (checklist UB-4, decided in M1):
 * Capacitor Filesystem `Directory.Data` — the app-private files
 * directory. It is not user-visible (unlike Documents, which would
 * expose the raw JSON in the Files app and invite accidental edits),
 * and it is not wiped by clearing the WebView cache. The store file is
 * therefore `Directory.Data/freelancer-store.json` on both Android and
 * iOS. Backup behaviour is platform-defined (Android Auto Backup /
 * iCloud backup of the app-private directory); no backup guarantee is
 * claimed — the in-app `.bak` rotation below is the recovery mechanism
 * the app itself controls.
 *
 * ATOMIC WRITE PROTOCOL (checklist §1 D-2) + CRASH SAFETY (M1 detail (b)):
 * 1. Serialize + schema-validate the document in memory.
 * 2. Write it to `freelancer-store.json.tmp`.
 * 3. Read the temp file back, parse it, schema-validate it.
 * 4. Rotate the previous live file to `freelancer-store.json.bak`
 *    (last known-good copy).
 * 5. Rename the temp file over the live file (`Filesystem.rename`).
 * If any step fails, the live file is untouched and the error is
 * surfaced, never swallowed. If the process dies between steps 4 and 5
 * the live file is missing but `.bak` holds the last good copy, and
 * `load()` restores it with a visible notice — so every interrupted
 * state is either old-intact, new-valid, or recoverable from `.bak`,
 * never a partially written live file. The protocol is proven by the
 * fault-injection tests in `store.test.ts` (P-1), which inject failures
 * after temp-write, after temp-verify, and during each rename.
 * `Filesystem.rename` runtime atomicity on Android/iOS is unproven on
 * device (checklist UB-1, no emulator in this VM); the protocol above
 * is deliberately "atomic OR recoverable", so it does not depend on
 * rename being atomic — only on rename never producing a partial file,
 * which the fault-injection harness asserts for the protocol itself.
 *
 * CORRUPTION HANDLING (checklist §1 D-3): a live file that fails to
 * parse or validate is renamed to
 * `freelancer-store.json.corrupt.<timestamp>` — never deleted, never
 * overwritten in place — then `.bak` is tried. If `.bak` is valid it is
 * restored and a visible recovery notice is returned. If both are
 * invalid the store starts empty ONLY after explicit user confirmation
 * (`initializeEmptyAfterConfirmation()`); until then nothing is written.
 */
import { Capacitor } from "@capacitor/core";
import {
  emptyStoreDocument,
  FutureSchemaVersionError,
  migrateDocument,
  newId,
  nowIso,
  validateClient,
  validateProject,
  validateStoreDocument,
  validateTimeEntry,
  type Client,
  type Project,
  type StoreDocument,
  type TimeEntry,
} from "./models";
import { buildInvoice, assertInvoiceTransition, type CreateInvoiceInput } from "./invoices";
import { resolveRateCents } from "./rates";
import {
  assertClientCap,
  assertInvoiceCap,
  monthKeyOfDate,
  type ProEntitlement,
} from "./entitlements";
import type { RunningTimer } from "./timer";
import type { AppSettings } from "./settings";

/** Build + validate + insert one entry into a draft document (shared by
 *  createEntry and convertTimerToSession so both use the same path). */
function insertEntry(
  draft: StoreDocument,
  input: Omit<TimeEntry, "id" | "rateCentsAtEntry" | "invoiceId" | "createdAt" | "updatedAt">,
  settings: AppSettings
): TimeEntry {
  const now = nowIso();
  const client = draft.clients.find((c) => c.id === input.clientId);
  if (!client) throw new Error(`Cannot create entry: client ${input.clientId} does not exist`);
  const project = input.projectId ? draft.projects.find((p) => p.id === input.projectId) : undefined;
  if (input.projectId && !project) throw new Error(`Cannot create entry: project ${input.projectId} does not exist`);
  if (project && project.clientId !== input.clientId) {
    throw new Error(`Cannot create entry: project ${input.projectId} belongs to a different client`);
  }
  const entry: TimeEntry = {
    ...input,
    id: newId(),
    rateCentsAtEntry: resolveRateCents({
      projectRateOverrideCents: project?.rateOverrideCents,
      clientDefaultRateCents: client.defaultRateCents,
      appDefaultRateCents: settings.defaultRateCents,
    }),
    invoiceId: null,
    createdAt: now,
    updatedAt: now,
  };
  const errors = validateTimeEntry(entry);
  if (errors.length) throw new Error(`Invalid entry: ${errors.join("; ")}`);
  draft.entries.push(entry);
  return entry;
}

export const STORE_FILE = "freelancer-store.json";
export const STORE_TMP_FILE = "freelancer-store.json.tmp";
export const STORE_BAK_FILE = "freelancer-store.json.bak";
export const STORE_CORRUPT_PREFIX = "freelancer-store.json.corrupt.";
export const STORE_EVENTS_FILE = "freelancer-store-events.json";

/** Minimal file operations the store needs. Implemented for Capacitor,
 *  localStorage (web preview), and in-memory (tests). */
export interface StoreFileAdapter {
  /** True when the file exists. */
  exists(path: string): Promise<boolean>;
  /** File contents as text, or null when the file does not exist.
   *  Throws when the file exists but cannot be read. */
  readText(path: string): Promise<string | null>;
  /** Overwrite (or create) the file with `text`. */
  writeText(path: string, text: string): Promise<void>;
  /** Rename `from` to `to`, replacing `to` when it already exists. */
  rename(from: string, to: string): Promise<void>;
  /** Delete the file when it exists; no-op when it does not. */
  remove(path: string): Promise<void>;
  /** Copy `from` to `to`, replacing `to` when it already exists. */
  copy(from: string, to: string): Promise<void>;
}

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Capacitor Filesystem adapter (native). `Directory.Data`, see UB-4 above. */
export function createCapacitorFileAdapter(): StoreFileAdapter {
  const dir = async () => {
    const { Directory } = await import("@capacitor/filesystem");
    return Directory.Data;
  };
  const fs = async () => await import("@capacitor/filesystem");
  return {
    async exists(path: string): Promise<boolean> {
      try {
        const { Filesystem } = await fs();
        await Filesystem.stat({ path, directory: await dir() });
        return true;
      } catch {
        return false;
      }
    },
    async readText(path: string): Promise<string | null> {
      const { Filesystem } = await fs();
      const directory = await dir();
      try {
        await Filesystem.stat({ path, directory });
      } catch {
        return null; // missing
      }
      const { data } = await Filesystem.readFile({ path, directory, encoding: (await fs()).Encoding.UTF8 });
      return data as string;
    },
    async writeText(path: string, text: string): Promise<void> {
      const { Filesystem } = await fs();
      await Filesystem.writeFile({ path, data: text, directory: await dir(), encoding: (await fs()).Encoding.UTF8 });
    },
    async rename(from: string, to: string): Promise<void> {
      const { Filesystem } = await fs();
      const directory = await dir();
      try {
        await Filesystem.rename({ from, to, directory });
      } catch {
        // Some platforms refuse to rename over an existing destination:
        // remove the destination and retry once. The destination here is
        // always a `.bak` or the live file inside the rotation protocol,
        // never user data outside it.
        await Filesystem.deleteFile({ path: to, directory }).catch(() => undefined);
        await Filesystem.rename({ from, to, directory });
      }
    },
    async remove(path: string): Promise<void> {
      const { Filesystem } = await fs();
      await Filesystem.deleteFile({ path, directory: await dir() }).catch(() => undefined);
    },
    async copy(from: string, to: string): Promise<void> {
      const { Filesystem } = await fs();
      const directory = await dir();
      try {
        await Filesystem.copy({ from, to, directory });
      } catch {
        // Copy over an existing destination can fail on some platforms:
        // remove the destination and retry once.
        await Filesystem.deleteFile({ path: to, directory }).catch(() => undefined);
        await Filesystem.copy({ from, to, directory });
      }
    },
  };
}

/**
 * localStorage adapter (web preview / browser QA only). Rename is emulated
 * as read + write + delete, which is NOT crash-atomic — it exists so the
 * dashboard can be exercised in a browser; it is never the source of
 * truth in the native app. Keys are namespaced per file.
 */
export function createLocalStorageFileAdapter(prefix = "triangletech-freelancer-file:"): StoreFileAdapter {
  const key = (path: string) => `${prefix}${path}`;
  const store = () => window.localStorage;
  return {
    async exists(path: string): Promise<boolean> {
      return store().getItem(key(path)) !== null;
    },
    async readText(path: string): Promise<string | null> {
      return store().getItem(key(path));
    },
    async writeText(path: string, text: string): Promise<void> {
      store().setItem(key(path), text);
    },
    async rename(from: string, to: string): Promise<void> {
      const value = store().getItem(key(from));
      if (value === null) throw new Error(`rename: ${from} does not exist`);
      store().setItem(key(to), value);
      store().removeItem(key(from));
    },
    async remove(path: string): Promise<void> {
      store().removeItem(key(path));
    },
    async copy(from: string, to: string): Promise<void> {
      const value = store().getItem(key(from));
      if (value === null) throw new Error(`copy: ${from} does not exist`);
      store().setItem(key(to), value);
    },
  };
}

/** Fault hooks for the in-memory adapter (fault-injection tests, P-1). */
export type MemoryAdapterFaults = {
  /** Throw from writeText when the path matches (or always when set to true). */
  failWrite?: boolean | ((path: string) => boolean);
  /** Throw from readText. */
  failRead?: boolean | ((path: string) => boolean);
  /** Throw from rename. Receives (from, to). */
  failRename?: boolean | ((from: string, to: string) => boolean);
};

/**
 * In-memory adapter for tests. Rename replaces the destination, matching
 * the adapter contract. Faults are consulted on every call so a test can
 * fail exactly one step of the write protocol.
 */
export function createMemoryFileAdapter(initial: Record<string, string> = {}): StoreFileAdapter & {
  files(): Record<string, string>;
  faults: MemoryAdapterFaults;
} {
  const map = new Map<string, string>(Object.entries(initial));
  const faults: MemoryAdapterFaults = {};
  return {
    faults,
    files(): Record<string, string> {
      return Object.fromEntries(map);
    },
    async exists(path: string): Promise<boolean> {
      return map.has(path);
    },
    async readText(path: string): Promise<string | null> {
      if (typeof faults.failRead === "function" ? faults.failRead(path) : faults.failRead) {
        throw new Error(`injected fault: readText(${path})`);
      }
      return map.has(path) ? (map.get(path) as string) : null;
    },
    async writeText(path: string, text: string): Promise<void> {
      if (typeof faults.failWrite === "function" ? faults.failWrite(path) : faults.failWrite) {
        throw new Error(`injected fault: writeText(${path})`);
      }
      map.set(path, text);
    },
    async rename(from: string, to: string): Promise<void> {
      if (typeof faults.failRename === "function" ? faults.failRename(from, to) : faults.failRename) {
        throw new Error(`injected fault: rename(${from} -> ${to})`);
      }
      if (!map.has(from)) throw new Error(`rename: ${from} does not exist`);
      map.set(to, map.get(from) as string);
      map.delete(from);
    },
    async remove(path: string): Promise<void> {
      map.delete(path);
    },
    async copy(from: string, to: string): Promise<void> {
      if (!map.has(from)) throw new Error(`copy: ${from} does not exist`);
      map.set(to, map.get(from) as string);
    },
  };
}

/** Default adapter: Capacitor Filesystem on native, localStorage on web. */
export function createDefaultFileAdapter(): StoreFileAdapter {
  return isNativeApp() ? createCapacitorFileAdapter() : createLocalStorageFileAdapter();
}

export type CorruptionEvent = {
  at: string;
  file: string;
  step: string;
  detail: string;
};

export type StoreLoadStatus = "ok" | "fresh-empty" | "recovered-from-backup" | "needs-confirmation";

export type StoreLoadResult = {
  status: StoreLoadStatus;
  /** Human-readable notice for the UI when status is not "ok". */
  notice: string | null;
  /** Migration report lines when a migration ran. */
  migrationReport: string[];
  /** Corruption events observed during this load (also in the log). */
  events: CorruptionEvent[];
};

export type StoreClock = () => Date;

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function corruptSuffix(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

/** The single-document store. Open with `FreelancerStore.open(adapter)`. */
export class FreelancerStore {
  private doc: StoreDocument;
  private readonly adapter: StoreFileAdapter;
  private readonly clock: StoreClock;
  private readonly events: CorruptionEvent[] = [];
  private loadStatus: StoreLoadStatus = "ok";
  private loadNotice: string | null = null;
  private migrationReport: string[] = [];

  private constructor(adapter: StoreFileAdapter, doc: StoreDocument, clock: StoreClock) {
    this.adapter = adapter;
    this.doc = doc;
    this.clock = clock;
  }

  /**
   * Open (or create) the store. Never throws for a corrupt live file —
   * corruption is reported in the result with quarantine + restore (D-3).
   * Throws `FutureSchemaVersionError` for a future schema version: the
   * file is left untouched and the UI must show the error.
   */
  static async open(
    adapter: StoreFileAdapter,
    opts: { clock?: StoreClock } = {}
  ): Promise<{ store: FreelancerStore; load: StoreLoadResult }> {
    const clock = opts.clock ?? (() => new Date());
    const store = new FreelancerStore(adapter, emptyStoreDocument(), clock);
    const load = await store.load();
    return { store, load };
  }

  /** Current document (deep copy — mutate only through the store methods). */
  get document(): StoreDocument {
    return clone(this.doc);
  }

  get status(): StoreLoadStatus {
    return this.loadStatus;
  }

  get notice(): string | null {
    return this.loadNotice;
  }

  get corruptionLog(): CorruptionEvent[] {
    return [...this.events];
  }

  get lastMigrationReport(): string[] {
    return [...this.migrationReport];
  }

  // --- load ---------------------------------------------------------------

  private async logEvent(step: string, detail: string, file: string = STORE_FILE): Promise<void> {
    const event: CorruptionEvent = { at: this.clock().toISOString(), file, step, detail };
    this.events.push(event);
    // Best-effort durable log; a logging failure must never break a load.
    try {
      const raw = await this.adapter.readText(STORE_EVENTS_FILE);
      let list: CorruptionEvent[] = [];
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) list = parsed as CorruptionEvent[];
      }
      list.push(event);
      await this.adapter.writeText(STORE_EVENTS_FILE, JSON.stringify(list.slice(-100)));
    } catch {
      /* logging is best-effort */
    }
  }

  /** Parse + validate + migrate one file's text. Returns null when invalid. */
  private parseDocumentText(text: string): { doc: StoreDocument; migratedFrom: number | null; report: string[] } | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
    try {
      return migrateDocument(parsed);
    } catch (err) {
      if (err instanceof FutureSchemaVersionError) throw err;
      return null;
    }
  }

  private async load(): Promise<StoreLoadResult> {
    const liveText = await this.adapter.readText(STORE_FILE);
    if (liveText === null) {
      // No live file: first launch, or a crash between .bak rotation and
      // the temp rename (detail (b)). A valid .bak restores the last good copy.
      const bakText = await this.adapter.readText(STORE_BAK_FILE);
      if (bakText !== null) {
        const parsed = this.parseDocumentText(bakText);
        if (parsed) {
          this.doc = parsed.doc;
          this.migrationReport = parsed.report;
          this.loadStatus = "recovered-from-backup";
          this.loadNotice =
            "The saved data file was missing, so the last good backup was restored. No entries were lost.";
          await this.logEvent("load-missing-live", "live file missing; restored from .bak");
          await this.saveDocument(this.doc);
          return this.loadResult();
        }
        await this.logEvent("load-missing-live", "live file missing and .bak is invalid; awaiting confirmation");
      }
      this.doc = emptyStoreDocument();
      this.loadStatus = "fresh-empty";
      this.loadNotice = null;
      return this.loadResult();
    }

    const parsed = this.parseDocumentText(liveText);
    if (parsed) {
      this.doc = parsed.doc;
      this.migrationReport = parsed.report;
      this.loadStatus = "ok";
      this.loadNotice = parsed.migratedFrom !== null ? `Data was migrated from schema v${parsed.migratedFrom} to v${parsed.doc.schemaVersion}.` : null;
      return this.loadResult();
    }

    // Corrupt live file: quarantine it (never delete, never overwrite),
    // then try the backup. The restore below reuses saveDocument, whose
    // rotation step would overwrite a good `.bak` with the corrupt live
    // file — so if quarantine fails outright (live still in place), stop
    // here: nothing is written, nothing is deleted, the user must act
    // manually (status "needs-confirmation").
    const suffix = corruptSuffix(this.clock());
    const quarantineName = `${STORE_CORRUPT_PREFIX}${suffix}`;
    let quarantined = false;
    try {
      await this.adapter.rename(STORE_FILE, quarantineName);
      quarantined = true;
    } catch {
      try {
        await this.adapter.copy(STORE_FILE, quarantineName);
        const check = await this.adapter.readText(quarantineName);
        if (check !== null) {
          await this.adapter.remove(STORE_FILE);
          quarantined = true;
        }
      } catch {
        /* fall through to the stop below */
      }
    }
    if (!quarantined) {
      await this.logEvent("quarantine-failed", `could not move live file to ${quarantineName}; leaving all files untouched`);
      this.doc = emptyStoreDocument();
      this.loadStatus = "needs-confirmation";
      this.loadNotice =
        "The saved data is damaged and could not be moved aside safely. " +
        "Nothing was deleted or overwritten — restore a backup file manually before continuing.";
      return this.loadResult();
    }
    await this.logEvent("corrupt-live", "live file failed to parse or validate", quarantineName);
    const bakText = await this.adapter.readText(STORE_BAK_FILE);
    if (bakText !== null) {
      const bakParsed = this.parseDocumentText(bakText);
      if (bakParsed) {
        this.doc = bakParsed.doc;
        this.migrationReport = bakParsed.report;
        this.loadStatus = "recovered-from-backup";
        this.loadNotice =
          "The saved data was damaged, so the last good backup was restored. " +
          `The damaged file was kept as ${quarantineName} — nothing was deleted.`;
        await this.logEvent("restored-from-backup", `restored .bak after quarantining ${quarantineName}`);
        await this.saveDocument(this.doc);
        return this.loadResult();
      }
      await this.logEvent("backup-invalid", ".bak also failed to parse or validate");
    }
    // Both live and backup are unusable: do NOT start empty silently.
    this.doc = emptyStoreDocument();
    this.loadStatus = "needs-confirmation";
    this.loadNotice =
      "The saved data and its backup are both damaged. The damaged files were kept — " +
      "nothing was deleted. Confirm to start with an empty store, or restore a backup file manually.";
    return this.loadResult();
  }

  private loadResult(): StoreLoadResult {
    return {
      status: this.loadStatus,
      notice: this.loadNotice,
      migrationReport: [...this.migrationReport],
      events: [...this.events],
    };
  }

  /** Reload from disk (e.g. after an external change). Same rules as open. */
  async reload(): Promise<StoreLoadResult> {
    return this.load();
  }

  /**
   * Start with an empty store after explicit user confirmation (D-3).
   * Only valid when the load status is "needs-confirmation"; otherwise
   * refuses, so no code path can silently wipe data.
   */
  async initializeEmptyAfterConfirmation(): Promise<StoreLoadResult> {
    if (this.loadStatus !== "needs-confirmation") {
      throw new Error(`initializeEmptyAfterConfirmation is only allowed after a failed load (current status: ${this.loadStatus})`);
    }
    this.doc = emptyStoreDocument();
    await this.saveDocument(this.doc);
    this.loadStatus = "fresh-empty";
    this.loadNotice = null;
    await this.logEvent("empty-after-confirmation", "user confirmed starting with an empty store");
    return this.loadResult();
  }

  // --- atomic save (protocol D-2) ------------------------------------------

  /**
   * Save `doc` with the atomic write protocol. The in-memory document is
   * only replaced by callers after this resolves; a failure leaves both
   * the live file and the in-memory document untouched.
   */
  async saveDocument(doc: StoreDocument): Promise<void> {
    const check = validateStoreDocument(doc);
    if (!check.ok) throw new Error(`Refusing to save an invalid store document: ${check.errors.join("; ")}`);
    const text = JSON.stringify(doc);
    // Step 2: write temp.
    await this.adapter.writeText(STORE_TMP_FILE, text);
    // Step 3: read back + parse + validate the temp file.
    const back = await this.adapter.readText(STORE_TMP_FILE);
    if (back === null) throw new Error("Temp file vanished after write; live file untouched");
    const verified = this.parseDocumentText(back);
    if (!verified) throw new Error("Temp file failed verification after write; live file untouched");
    // Step 4: rotate the previous live file to .bak.
    if (await this.adapter.exists(STORE_FILE)) {
      await this.adapter.rename(STORE_FILE, STORE_BAK_FILE);
    }
    // Step 5: rename temp over live. If this fails, restore .bak to live
    // so the store is never left without a live file.
    try {
      await this.adapter.rename(STORE_TMP_FILE, STORE_FILE);
    } catch (err) {
      try {
        if (await this.adapter.exists(STORE_BAK_FILE)) {
          await this.adapter.rename(STORE_BAK_FILE, STORE_FILE);
        }
      } catch {
        /* restore failed too; the .bak still exists for manual recovery */
      }
      throw err;
    }
  }

  /**
   * Run a mutation against a clone and save it atomically. If the mutation
   * throws or the save fails, the in-memory document is unchanged — this is
   * what makes invoice creation all-or-nothing (checklist I-2 / I-C5).
   */
  async transact<T>(fn: (draft: StoreDocument) => T): Promise<T> {
    const draft = clone(this.doc);
    const result = fn(draft);
    draft.updatedAt = this.clock().toISOString();
    await this.saveDocument(draft);
    this.doc = draft;
    return result;
  }

  // --- lookups (read-only copies) ------------------------------------------

  getClient(id: string): Client | undefined {
    const found = this.doc.clients.find((c) => c.id === id);
    return found ? clone(found) : undefined;
  }

  getProject(id: string): Project | undefined {
    const found = this.doc.projects.find((p) => p.id === id);
    return found ? clone(found) : undefined;
  }

  getEntry(id: string): TimeEntry | undefined {
    const found = this.doc.entries.find((e) => e.id === id);
    return found ? clone(found) : undefined;
  }

  getInvoice(id: string): import("./models").Invoice | undefined {
    const found = this.doc.invoices.find((i) => i.id === id);
    return found ? clone(found) : undefined;
  }

  // --- mutations ------------------------------------------------------------

  async createClient(input: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> {
    const now = nowIso();
    const client: Client = { ...input, id: newId(), createdAt: now, updatedAt: now };
    const errors = validateClient(client);
    if (errors.length) throw new Error(`Invalid client: ${errors.join("; ")}`);
    return this.transact((draft) => {
      // M4 Free cap: 3 clients total (archived included), Pro unlimited.
      // Checked inside transact() so the decision and the creation are
      // one atomic step — no race can create a 4th Free client.
      assertClientCap(draft, this.clock());
      draft.clients.push(client);
      return client;
    });
  }

  async createProject(input: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const now = nowIso();
    const project: Project = { ...input, id: newId(), createdAt: now, updatedAt: now };
    const errors = validateProject(project);
    if (errors.length) throw new Error(`Invalid project: ${errors.join("; ")}`);
    return this.transact((draft) => {
      if (!draft.clients.some((c) => c.id === project.clientId)) {
        throw new Error(`Cannot create project: client ${project.clientId} does not exist`);
      }
      draft.projects.push(project);
      return project;
    });
  }

  /** Update a client's mutable fields (rate changes affect only future sessions — R-2). */
  async updateClient(id: string, patch: Partial<Omit<Client, "id" | "createdAt" | "updatedAt">>): Promise<Client> {
    return this.transact((draft) => {
      const client = draft.clients.find((c) => c.id === id);
      if (!client) throw new Error(`Cannot update client: ${id} does not exist`);
      Object.assign(client, patch, { updatedAt: this.clock().toISOString() });
      const errors = validateClient(client);
      if (errors.length) throw new Error(`Invalid client: ${errors.join("; ")}`);
      return clone(client);
    });
  }

  /** Update a project's mutable fields. */
  async updateProject(id: string, patch: Partial<Omit<Project, "id" | "clientId" | "createdAt" | "updatedAt">>): Promise<Project> {
    return this.transact((draft) => {
      const project = draft.projects.find((p) => p.id === id);
      if (!project) throw new Error(`Cannot update project: ${id} does not exist`);
      Object.assign(project, patch, { updatedAt: this.clock().toISOString() });
      const errors = validateProject(project);
      if (errors.length) throw new Error(`Invalid project: ${errors.join("; ")}`);
      return clone(project);
    });
  }

  async createEntry(
    input: Omit<TimeEntry, "id" | "rateCentsAtEntry" | "invoiceId" | "createdAt" | "updatedAt">,
    settings: AppSettings
  ): Promise<TimeEntry> {
    return this.transact((draft) => insertEntry(draft, input, settings));
  }

  /**
   * Edit a session (M2). Invoiced sessions CANNOT be edited: their hours
   * are already snapshotted onto an invoice, so changing them would
   * silently desync the invoice. The rate snapshot is preserved unless
   * the client or project changes, in which case the rate is re-resolved
   * from the new client/project (a new effective creation, not a silent
   * rewrite of history — R-2 still holds for rate changes alone).
   */
  async updateEntry(
    id: string,
    patch: Partial<Omit<TimeEntry, "id" | "rateCentsAtEntry" | "invoiceId" | "createdAt" | "updatedAt">>,
    settings: AppSettings
  ): Promise<TimeEntry> {
    return this.transact((draft) => {
      const entry = draft.entries.find((e) => e.id === id);
      if (!entry) throw new Error(`Cannot update entry: ${id} does not exist`);
      if (entry.invoiceId !== null) {
        throw new Error(`Cannot edit entry ${id}: it is already on invoice ${entry.invoiceId}`);
      }
      const clientChanged = "clientId" in patch && patch.clientId !== entry.clientId;
      const projectChanged = "projectId" in patch && patch.projectId !== entry.projectId;
      Object.assign(entry, patch, { updatedAt: this.clock().toISOString() });
      if (clientChanged || projectChanged) {
        const client = draft.clients.find((c) => c.id === entry.clientId);
        if (!client) throw new Error(`Cannot update entry: client ${entry.clientId} does not exist`);
        const project = entry.projectId ? draft.projects.find((p) => p.id === entry.projectId) : undefined;
        if (entry.projectId && !project) throw new Error(`Cannot update entry: project ${entry.projectId} does not exist`);
        if (project && project.clientId !== entry.clientId) {
          throw new Error(`Cannot update entry: project ${entry.projectId} belongs to a different client`);
        }
        entry.rateCentsAtEntry = resolveRateCents({
          projectRateOverrideCents: project?.rateOverrideCents,
          clientDefaultRateCents: client.defaultRateCents,
          appDefaultRateCents: settings.defaultRateCents,
        });
      }
      const errors = validateTimeEntry(entry);
      if (errors.length) throw new Error(`Invalid entry: ${errors.join("; ")}`);
      return clone(entry);
    });
  }

  /**
   * Delete a session (M2). Invoiced sessions CANNOT be deleted, for the
   * same reason as updateEntry: the invoice already snapshots their hours.
   */
  async deleteEntry(id: string): Promise<void> {
    await this.transact((draft) => {
      const index = draft.entries.findIndex((e) => e.id === id);
      if (index === -1) throw new Error(`Cannot delete entry: ${id} does not exist`);
      if (draft.entries[index]?.invoiceId !== null) {
        throw new Error(`Cannot delete entry ${id}: it is already on invoice ${draft.entries[index]?.invoiceId}`);
      }
      draft.entries.splice(index, 1);
    });
  }

  // --- running timer (M2, schema v3) ---------------------------------------

  /** Persist the running-timer state (null clears it). One atomic write. */
  async setRunningTimer(timer: RunningTimer | null): Promise<void> {
    await this.transact((draft) => {
      draft.runningTimer = timer === null ? null : clone(timer);
    });
  }

  /**
   * Stop a timer and record its session in ONE atomic write: the entry is
   * created (origin "timer", mode "direct", via the same insertEntry path
   * as manual creation) and the running timer is cleared together. If the
   * write fails, no session exists and the timer keeps running — the
   * elapsed time is never lost to a half-finished stop.
   */
  async convertTimerToSession(
    timer: RunningTimer,
    session: { directHours: number; breakMinutes: number; notes?: string },
    settings: AppSettings
  ): Promise<TimeEntry> {
    return this.transact((draft) => {
      const current = draft.runningTimer;
      if (current === null || current.id !== timer.id) {
        throw new Error("Cannot stop timer: no matching timer is running");
      }
      if (session.directHours <= 0) {
        throw new Error("Cannot record a timer session with zero paid hours — take a shorter break or let the timer run longer.");
      }
      const entry = insertEntry(
        draft,
        {
          clientId: timer.clientId,
          ...(timer.projectId ? { projectId: timer.projectId } : {}),
          date: timer.date,
          startTime: "",
          endTime: "",
          endsNextDay: false,
          breakMinutes: session.breakMinutes,
          mode: "direct",
          directHours: session.directHours,
          notes: session.notes ?? timer.notes,
          origin: "timer",
        },
        settings
      );
      draft.runningTimer = null;
      return entry;
    });
  }

  /**
   * Create an invoice + increment the sequence counter + mark its entries
   * as invoiced, in ONE atomic store write (checklist I-2). Any failure
   * (validation, double-invoicing, write fault) leaves no invoice, an
   * unchanged counter, and unmarked entries.
   *
   * M4 Free cap: 3 created invoices per calendar month (by issue date;
   * void invoices still count — see entitlements.ts), plus any
   * rewarded-ad grants earned that month. Pro is unlimited. The cap is
   * checked inside transact() so the decision and the creation are one
   * atomic step. Throws FreeCapError when the cap is hit — the UI shows
   * the Pro upsell / rewarded-ad offer instead of a generic error.
   */
  async createInvoice(input: CreateInvoiceInput, settings: AppSettings) {
    return this.transact((draft) => {
      const issueDate = input.issueDate ?? this.clock().toISOString().slice(0, 10);
      assertInvoiceCap(draft, issueDate, this.clock());
      return buildInvoice(draft, input, settings);
    });
  }

  /**
   * Persist the last-known Pro entitlement (M4). Called after a
   * purchase, a restore, and the launch-time re-verification against
   * the store SDK. Overwrites the cached value in one atomic write;
   * passing null clears Pro (the store reported no purchase).
   */
  async setEntitlement(entitlement: ProEntitlement | null): Promise<void> {
    await this.transact((draft) => {
      draft.proEntitlement = entitlement === null ? null : { ...entitlement };
    });
  }

  /**
   * Grant ONE extra invoice for the current calendar month, earned by
   * watching a rewarded ad (M4, plan §9). The month comes from the
   * store clock (mockable in tests); a grant in a new month resets the
   * count. Returns the total grants earned in the current month.
   */
  async grantRewardedInvoice(): Promise<number> {
    return this.transact((draft) => {
      const month = monthKeyOfDate(this.clock().toISOString().slice(0, 10));
      if (draft.rewardGrants.month !== month) draft.rewardGrants = { month, count: 0 };
      draft.rewardGrants.count += 1;
      return draft.rewardGrants.count;
    });
  }

  /** Void an invoice (M3: from `draft` or `sent` only). The number is
   *  never reused and the invoice stays retrievable (I-3). A paid
   *  invoice cannot be voided — its money is recorded as received. */
  async voidInvoice(id: string) {
    return this.transact((draft) => {
      const invoice = draft.invoices.find((i) => i.id === id);
      if (!invoice) throw new Error(`Cannot void invoice: ${id} does not exist`);
      assertInvoiceTransition(invoice.status, "void");
      invoice.status = "void";
      invoice.updatedAt = this.clock().toISOString();
      return clone(invoice);
    });
  }

  /**
   * Mark a draft invoice sent (M3). Only `draft → sent` is legal; the
   * display status becomes `overdue` on its own once today passes the
   * due date — no stored status ever changes to "overdue".
   */
  async markInvoiceSent(id: string) {
    return this.transact((draft) => {
      const invoice = draft.invoices.find((i) => i.id === id);
      if (!invoice) throw new Error(`Cannot mark invoice sent: ${id} does not exist`);
      assertInvoiceTransition(invoice.status, "sent");
      invoice.status = "sent";
      invoice.updatedAt = this.clock().toISOString();
      return clone(invoice);
    });
  }

  /** Mark a sent invoice paid (M3). Only `sent → paid` is legal. */
  async markInvoicePaid(id: string) {
    return this.transact((draft) => {
      const invoice = draft.invoices.find((i) => i.id === id);
      if (!invoice) throw new Error(`Cannot mark invoice paid: ${id} does not exist`);
      assertInvoiceTransition(invoice.status, "paid");
      invoice.status = "paid";
      invoice.updatedAt = this.clock().toISOString();
      return clone(invoice);
    });
  }
}
