/**
 * Image Compressor to Target KB — pure logic.
 *
 * Everything in this module is environment-independent (no DOM, no canvas)
 * so it can be unit-tested in Node. The browser component supplies an
 * `encode` callback that actually rasterises with <canvas>; this module
 * owns validation, formatting and the iterative search policy.
 *
 * Honesty rule: a result is only reported as meeting the target when the
 * actual encoded byte size is <= the target. There is no estimation path.
 */

export type OutputFormat = "image/jpeg" | "image/webp";

export const OUTPUT_FORMATS: { format: OutputFormat; label: string; extension: string }[] = [
  { format: "image/jpeg", label: "JPG", extension: "jpg" },
  { format: "image/webp", label: "WebP", extension: "webp" },
];

export const PRESET_TARGET_KB = [50, 100, 200, 500] as const;

export const MIN_TARGET_KB = 10;
export const MAX_TARGET_KB = 10_000;

/** Reasonable client-side limits: protects memory on low-end phones. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_IMAGE_DIMENSION = 12_000; // px on either side
export const MAX_IMAGE_PIXELS = 40_000_000; // 40 MP

/** We never encode below this quality; below it artefacts stop being acceptable. */
export const MIN_QUALITY = 0.4;
export const MAX_QUALITY = 0.92;

/** When resizing, stop once the long edge would fall below this (unless the
 *  source is already smaller — we never upscale). */
export const MIN_OUTPUT_LONG_EDGE = 320;

/** Each resize step multiplies dimensions by this factor. */
export const SCALE_STEP = 0.85;

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export interface FileMeta {
  name: string;
  size: number;
  type: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/**
 * Validate an uploaded file before any decoding is attempted.
 * Returns a user-facing error message, or null when the file is acceptable.
 * The MIME type is checked first; the extension is accepted as a fallback
 * because some mobile browsers report an empty or generic type.
 */
export function validateImageFile(file: FileMeta): string | null {
  if (file.size === 0) {
    return "That file is empty. Choose an image with content and try again.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That image is ${formatBytes(file.size)}. This tool accepts files up to ${formatBytes(MAX_FILE_BYTES)} so it can process them safely on your device.`;
  }
  const typeOk = (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type);
  const extOk = (ACCEPTED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name));
  if (file.type && !typeOk && !extOk) {
    return "That file format is not supported. Choose a JPG, PNG or WebP image.";
  }
  if (!file.type && !extOk) {
    return "We could not tell what format that file is. Choose a JPG, PNG or WebP image.";
  }
  return null;
}

export interface ImageByteSample {
  /** Total file size in bytes. */
  size: number;
  /** First bytes of the file (at least 16 when the file is that large). */
  head: Uint8Array;
  /** Last bytes of the file (up to the final 1024 bytes). */
  tail: Uint8Array;
  type: string;
  name: string;
}

function containsBytes(haystack: Uint8Array, needle: readonly number[]): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Cheap structural integrity check on the raw bytes, run before decoding.
 *
 * Browser decoders are lenient: a truncated PNG/JPEG can "decode" into a
 * mostly blank bitmap, and the tool would then report success on garbage.
 * Each format has a deterministic end condition we can verify instead:
 * PNG must contain its IEND chunk near the end, JPEG must contain its EOI
 * marker (FF D9) near the end, and a WebP RIFF header declares the exact
 * file size. Returns a user-facing error, or null when the bytes look
 * structurally complete (or the format is not one we can check — the
 * decoder remains the judge there).
 */
export function checkImageIntegrity(sample: ImageByteSample): string | null {
  const corrupt =
    "That file appears to be incomplete or corrupted — its end marker is missing, so it cannot be processed safely. Try re-exporting the image and uploading again.";
  const { head, tail, size } = sample;
  const ext = extensionOf(sample.name);
  const isJpeg = sample.type === "image/jpeg" || ext === ".jpg" || ext === ".jpeg";
  const isPng = sample.type === "image/png" || ext === ".png";
  const isWebp = sample.type === "image/webp" || ext === ".webp";

  if (isPng) {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (head.length < 8 || !signature.every((b, i) => head[i] === b)) return corrupt;
    // IEND chunk type bytes "IEND" must appear in the tail sample.
    if (!containsBytes(tail, [0x49, 0x45, 0x4e, 0x44])) return corrupt;
    return null;
  }
  if (isJpeg) {
    if (head.length < 2 || head[0] !== 0xff || head[1] !== 0xd8) return corrupt;
    if (!containsBytes(tail, [0xff, 0xd9])) return corrupt;
    return null;
  }
  if (isWebp) {
    const riff = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
    const webp = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
    if (head.length < 12 || !riff.every((b, i) => head[i] === b) || !webp.every((b, i) => head[8 + i] === b)) return corrupt;
    const declaredSize = head[4] | (head[5] << 8) | (head[6] << 16) | (head[7] << 24);
    if (declaredSize !== size - 8) return corrupt;
    return null;
  }
  return null;
}

/** Validate decoded dimensions before allocating a canvas. */
export function validateImageDimensions(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return "That image could not be read. It may be corrupted — try re-exporting it and uploading again.";
  }
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return `That image is ${width} × ${height}px. This tool accepts up to ${MAX_IMAGE_DIMENSION.toLocaleString("en-US")}px per side.`;
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    return `That image is ${width} × ${height}px (${Math.round((width * height) / 1_000_000)} megapixels). This tool accepts up to 40 megapixels so processing stays reliable on phones.`;
  }
  return null;
}

/** Validate a target size in KB. Returns a user-facing error or null. */
export function validateTargetKb(targetKb: number): string | null {
  if (!Number.isFinite(targetKb) || !Number.isInteger(targetKb)) {
    return "Enter a whole number for the target size in KB.";
  }
  if (targetKb < MIN_TARGET_KB) {
    return `The smallest target is ${MIN_TARGET_KB} KB. Below that, most photos cannot keep acceptable quality.`;
  }
  if (targetKb > MAX_TARGET_KB) {
    return `The largest target is ${MAX_TARGET_KB.toLocaleString("en-US")} KB.`;
  }
  return null;
}

/** True only when the actual byte size is at or under the target. */
export function meetsTarget(sizeBytes: number, targetKb: number): boolean {
  return sizeBytes <= targetKb * 1024;
}

/** Format a byte count as B / KB / MB (1024-based), with sensible precision. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : Number(kb.toFixed(1))} KB`;
  const mb = kb / 1024;
  return `${Number(mb.toFixed(2))} MB`;
}

/**
 * Percentage reduction from original to optimized.
 * Positive means smaller; negative means the result is larger than the
 * original (possible when converting a small PNG to JPG at high quality).
 */
export function reductionPercent(originalBytes: number, optimizedBytes: number): number {
  if (originalBytes <= 0) return 0;
  return ((originalBytes - optimizedBytes) / originalBytes) * 100;
}

export interface Dimensions {
  width: number;
  height: number;
}

export function scaledDimensions(width: number, height: number, scale: number): Dimensions {
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * The ladder of scales to try, largest first: 1, 0.85, 0.72, …
 * Stops before the long edge would drop below MIN_OUTPUT_LONG_EDGE, but
 * always includes 1 (never upscale) and one final step near the floor
 * when the source is larger than the floor.
 */
export function scaleSteps(width: number, height: number): number[] {
  const longEdge = Math.max(width, height);
  if (longEdge <= MIN_OUTPUT_LONG_EDGE) return [1];
  const steps: number[] = [];
  let scale = 1;
  while (scale > 0) {
    const dims = scaledDimensions(width, height, scale);
    if (Math.max(dims.width, dims.height) < MIN_OUTPUT_LONG_EDGE && steps.length > 0) break;
    steps.push(scale);
    scale *= SCALE_STEP;
  }
  return steps;
}

/** Build a safe download filename from the source name. */
export function downloadFileName(originalName: string, format: OutputFormat, targetKb: number): string {
  const ext = format === "image/jpeg" ? "jpg" : "webp";
  const base = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "image"}-compressed-${targetKb}kb.${ext}`;
}

export interface EncodedCandidate<T> {
  value: T;
  size: number;
  quality: number;
  scale: number;
  width: number;
  height: number;
}

export interface CompressToTargetOptions<T> {
  targetBytes: number;
  width: number;
  height: number;
  /** Encode at the given quality/dimensions. Return null on encoder failure. */
  encode: (quality: number, dims: Dimensions, scale: number) => Promise<T | null>;
  sizeOf: (value: T) => number;
  maxQuality?: number;
  minQuality?: number;
  /** Binary-search steps per scale after the min/max probes. */
  qualityIterations?: number;
}

export interface CompressToTargetResult<T> {
  best: EncodedCandidate<T>;
  /** True only when best.size <= targetBytes (checked against real bytes). */
  meetsTarget: boolean;
  attempts: number;
}

/**
 * Iterative compression search.
 *
 * For each scale (largest first): probe max quality — if it already fits,
 * it is the best possible result and we stop. Probe min quality — if even
 * that does not fit, remember it as the best effort so far and resize
 * smaller. Otherwise binary-search the quality range for the highest
 * quality whose real encoded size fits.
 *
 * If no scale fits, the smallest acceptable-quality candidate is returned
 * with meetsTarget: false so the UI can say so plainly.
 */
export async function compressToTarget<T>(options: CompressToTargetOptions<T>): Promise<CompressToTargetResult<T>> {
  const maxQuality = options.maxQuality ?? MAX_QUALITY;
  const minQuality = options.minQuality ?? MIN_QUALITY;
  const iterations = options.qualityIterations ?? 6;
  let attempts = 0;
  let bestEffort: EncodedCandidate<T> | null = null;

  const run = async (quality: number, dims: Dimensions, scale: number): Promise<EncodedCandidate<T>> => {
    attempts += 1;
    const value = await options.encode(quality, dims, scale);
    if (value === null) throw new Error("ENCODER_FAILED");
    return { value, size: options.sizeOf(value), quality, scale, width: dims.width, height: dims.height };
  };

  for (const scale of scaleSteps(options.width, options.height)) {
    const dims = scaledDimensions(options.width, options.height, scale);

    const atMax = await run(maxQuality, dims, scale);
    if (atMax.size <= options.targetBytes) {
      return { best: atMax, meetsTarget: true, attempts };
    }

    const atMin = await run(minQuality, dims, scale);
    if (!bestEffort || atMin.size < bestEffort.size) bestEffort = atMin;
    if (atMin.size > options.targetBytes) continue;

    let lo = minQuality;
    let hi = maxQuality;
    let bestUnder = atMin;
    for (let i = 0; i < iterations; i += 1) {
      const mid = (lo + hi) / 2;
      const candidate = await run(mid, dims, scale);
      if (candidate.size <= options.targetBytes) {
        bestUnder = candidate;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return { best: bestUnder, meetsTarget: true, attempts };
  }

  if (!bestEffort) throw new Error("ENCODER_FAILED");
  return { best: bestEffort, meetsTarget: false, attempts };
}
