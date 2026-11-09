import { Capacitor } from "@capacitor/core";
import { downloadBlob } from "@/lib/tools/simple-pdf";

/**
 * Capacitor helpers for the TriangleTech Tools app.
 *
 * Every function is a no-op / web-fallback when NOT running inside the
 * Capacitor native shell, so the website build and behaviour are unchanged:
 * - shareOrDownloadBlob() falls back to the existing `downloadBlob`
 *   (Blob + anchor) on the web.
 * - favorites / recently-used use Capacitor Preferences natively and
 *   localStorage on the web.
 */

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
    }
    return btoa(binary);
  });
}

/**
 * Export a file in the native app: write it to the cache directory and open
 * the system share sheet (Save to Files / Mail / Drive / …). On the web, or
 * if any native step fails, fall back to the normal browser download.
 * The file CONTENT is unchanged — this only changes the transport, so PDF
 * branding, page numbers and CSV schemas are identical to the web export.
 */
export async function shareOrDownloadBlob(blob: Blob, filename: string): Promise<void> {
  if (!isNativeApp()) {
    downloadBlob(blob, filename);
    return;
  }
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const data = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    await Share.share({
      title: filename,
      text: filename,
      url: saved.uri,
      dialogTitle: `Share ${filename}`,
    });
  } catch {
    // Share sheet dismissed, file write failed, or plugin unavailable:
    // fall back to the browser download instead of losing the export.
    downloadBlob(blob, filename);
  }
}

// --- favorites + recently used (Preferences natively, localStorage on web) ---

const FAVORITES_KEY = "triangletech-mobile-favorites";
const RECENT_KEY = "triangletech-mobile-recent";
const MAX_RECENT = 5;

async function readList(key: string): Promise<string[]> {
  if (isNativeApp()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key });
      return value ? (JSON.parse(value) as string[]) : [];
    } catch {
      return [];
    }
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeList(key: string, list: string[]): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value: JSON.stringify(list) });
      return;
    } catch {
      /* fall through to localStorage */
    }
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage unavailable: favorites/recent simply do not persist */
  }
}

export async function getFavorites(): Promise<string[]> {
  return readList(FAVORITES_KEY);
}

export async function toggleFavorite(slug: string): Promise<string[]> {
  const list = await readList(FAVORITES_KEY);
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  await writeList(FAVORITES_KEY, next);
  return next;
}

export async function getRecent(): Promise<string[]> {
  return readList(RECENT_KEY);
}

export async function recordRecent(slug: string): Promise<void> {
  const list = (await readList(RECENT_KEY)).filter((s) => s !== slug);
  await writeList(RECENT_KEY, [slug, ...list].slice(0, MAX_RECENT));
}
