import { describe, expect, it } from "vitest";
import {
  checkImageIntegrity,
  compressToTarget,
  downloadFileName,
  formatBytes,
  meetsTarget,
  reductionPercent,
  scaleSteps,
  scaledDimensions,
  validateImageDimensions,
  validateImageFile,
  validateTargetKb,
  MAX_FILE_BYTES,
  MIN_OUTPUT_LONG_EDGE,
} from "@/lib/tools/image-compressor";

describe("validateImageFile", () => {
  it("accepts JPG, PNG and WebP within the size limit", () => {
    expect(validateImageFile({ name: "a.jpg", size: 1000, type: "image/jpeg" })).toBeNull();
    expect(validateImageFile({ name: "a.png", size: 1000, type: "image/png" })).toBeNull();
    expect(validateImageFile({ name: "a.webp", size: 1000, type: "image/webp" })).toBeNull();
  });

  it("rejects unsupported formats, empty files and oversized files", () => {
    expect(validateImageFile({ name: "a.gif", size: 1000, type: "image/gif" })).toMatch(/not supported/);
    expect(validateImageFile({ name: "a.jpg", size: 0, type: "image/jpeg" })).toMatch(/empty/);
    expect(validateImageFile({ name: "a.jpg", size: MAX_FILE_BYTES + 1, type: "image/jpeg" })).toMatch(/up to/);
  });

  it("falls back to the extension when the browser reports no MIME type", () => {
    expect(validateImageFile({ name: "photo.PNG", size: 1000, type: "" })).toBeNull();
    expect(validateImageFile({ name: "photo.bmp", size: 1000, type: "" })).toMatch(/could not tell/);
  });
});

describe("checkImageIntegrity", () => {
  const pngHead = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
  const pngTailIend = new Uint8Array([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  const jpegHead = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const jpegTailEoi = new Uint8Array([0x11, 0x22, 0xff, 0xd9]);
  const webpHead = (declared: number) =>
    new Uint8Array([0x52, 0x49, 0x46, 0x46, declared & 0xff, (declared >> 8) & 0xff, (declared >> 16) & 0xff, (declared >> 24) & 0xff, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0]);

  it("accepts structurally complete PNG, JPEG and WebP files", () => {
    expect(checkImageIntegrity({ size: 5000, head: pngHead, tail: pngTailIend, type: "image/png", name: "a.png" })).toBeNull();
    expect(checkImageIntegrity({ size: 5000, head: jpegHead, tail: jpegTailEoi, type: "image/jpeg", name: "a.jpg" })).toBeNull();
    expect(checkImageIntegrity({ size: 5008, head: webpHead(5000), tail: new Uint8Array(0), type: "image/webp", name: "a.webp" })).toBeNull();
  });

  it("rejects truncated files whose end markers are missing", () => {
    // Truncated PNG: valid signature, no IEND in the tail.
    expect(checkImageIntegrity({ size: 120, head: pngHead, tail: new Uint8Array([1, 2, 3]), type: "image/png", name: "a.png" })).toMatch(/incomplete or corrupted/);
    // Truncated JPEG: no EOI marker near the end.
    expect(checkImageIntegrity({ size: 900, head: jpegHead, tail: new Uint8Array([0x11, 0x22]), type: "image/jpeg", name: "a.jpg" })).toMatch(/incomplete or corrupted/);
    // Truncated WebP: RIFF declares more bytes than the file holds.
    expect(checkImageIntegrity({ size: 4000, head: webpHead(5000), tail: new Uint8Array(0), type: "image/webp", name: "a.webp" })).toMatch(/incomplete or corrupted/);
  });

  it("rejects files whose header does not match their format", () => {
    expect(checkImageIntegrity({ size: 100, head: jpegHead, tail: pngTailIend, type: "image/png", name: "a.png" })).toMatch(/incomplete or corrupted/);
  });

  it("defers to the decoder for formats it cannot check", () => {
    expect(checkImageIntegrity({ size: 10, head: new Uint8Array([1, 2]), tail: new Uint8Array(0), type: "", name: "a.bmp" })).toBeNull();
  });
});

describe("validateImageDimensions", () => {
  it("accepts ordinary photo dimensions", () => {
    expect(validateImageDimensions(4032, 3024)).toBeNull();
  });
  it("rejects unreadable, oversized-dimension and over-pixel images", () => {
    expect(validateImageDimensions(0, 0)).toMatch(/could not be read/);
    expect(validateImageDimensions(13_000, 100)).toMatch(/per side/);
    expect(validateImageDimensions(8000, 6000)).toMatch(/megapixels/);
  });
});

describe("validateTargetKb", () => {
  it("accepts the presets and in-range custom values", () => {
    for (const kb of [50, 100, 200, 500, 10, 750]) expect(validateTargetKb(kb)).toBeNull();
  });
  it("rejects non-integers and out-of-range values", () => {
    expect(validateTargetKb(50.5)).toMatch(/whole number/);
    expect(validateTargetKb(5)).toMatch(/smallest target/);
    expect(validateTargetKb(20_000)).toMatch(/largest target/);
    expect(validateTargetKb(Number.NaN)).toMatch(/whole number/);
  });
});

describe("size helpers", () => {
  it("formats bytes with 1024-based units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(50 * 1024)).toBe("50 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2 MB");
  });

  it("checks the target against real bytes, never an estimate", () => {
    expect(meetsTarget(50 * 1024, 50)).toBe(true);
    expect(meetsTarget(50 * 1024 + 1, 50)).toBe(false);
  });

  it("computes signed reduction percentages", () => {
    expect(reductionPercent(200_000, 50_000)).toBe(75);
    expect(reductionPercent(100_000, 100_000)).toBe(0);
    expect(reductionPercent(100_000, 150_000)).toBe(-50);
  });
});

describe("scaleSteps / scaledDimensions", () => {
  it("starts at 1, decreases, and never drops the long edge below the floor", () => {
    const steps = scaleSteps(4000, 3000);
    expect(steps[0]).toBe(1);
    expect(steps.length).toBeGreaterThan(1);
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]).toBeLessThan(steps[i - 1]);
    const last = scaledDimensions(4000, 3000, steps[steps.length - 1]);
    expect(Math.max(last.width, last.height)).toBeGreaterThanOrEqual(MIN_OUTPUT_LONG_EDGE);
  });

  it("never upscales a small image", () => {
    expect(scaleSteps(300, 200)).toEqual([1]);
  });

  it("rounds dimensions and keeps them at least 1px", () => {
    expect(scaledDimensions(101, 51, 0.5)).toEqual({ width: 51, height: 26 });
    expect(scaledDimensions(1, 1, 0.1)).toEqual({ width: 1, height: 1 });
  });
});

describe("downloadFileName", () => {
  it("sanitizes the base name and appends format and target", () => {
    expect(downloadFileName("My Holiday Photo!.PNG", "image/jpeg", 100)).toBe("my-holiday-photo-compressed-100kb.jpg");
    expect(downloadFileName("shot.webp", "image/webp", 50)).toBe("shot-compressed-50kb.webp");
    expect(downloadFileName("!!!.png", "image/webp", 200)).toBe("image-compressed-200kb.webp");
  });
});

/** Fake encoder: byte size grows with quality and pixel count, like a real codec. */
function fakeEncoder(baseBytes: number) {
  return async (quality: number, dims: { width: number; height: number }) => {
    const pixels = dims.width * dims.height;
    const size = Math.round(baseBytes * (pixels / (4000 * 3000)) * (0.25 + quality));
    return { size };
  };
}

describe("compressToTarget", () => {
  it("returns the max-quality encode immediately when it already fits", async () => {
    const result = await compressToTarget({
      targetBytes: 500 * 1024,
      width: 4000,
      height: 3000,
      encode: fakeEncoder(300_000),
      sizeOf: (v) => v.size,
    });
    expect(result.meetsTarget).toBe(true);
    expect(result.best.scale).toBe(1);
    expect(result.best.size).toBeLessThanOrEqual(500 * 1024);
    expect(result.attempts).toBe(1);
  });

  it("binary-searches quality at full size when that is enough", async () => {
    const result = await compressToTarget({
      targetBytes: 200 * 1024,
      width: 4000,
      height: 3000,
      encode: fakeEncoder(300_000),
      sizeOf: (v) => v.size,
    });
    expect(result.meetsTarget).toBe(true);
    expect(result.best.scale).toBe(1);
    expect(result.best.size).toBeLessThanOrEqual(200 * 1024);
    expect(result.best.quality).toBeGreaterThan(0.4);
  });

  it("resizes only when quality alone cannot reach the target", async () => {
    const result = await compressToTarget({
      targetBytes: 50 * 1024,
      width: 4000,
      height: 3000,
      encode: fakeEncoder(300_000),
      sizeOf: (v) => v.size,
    });
    expect(result.meetsTarget).toBe(true);
    expect(result.best.scale).toBeLessThan(1);
    expect(result.best.size).toBeLessThanOrEqual(50 * 1024);
  });

  it("reports meetsTarget=false with the smallest acceptable result when the target is unreachable", async () => {
    // Even at min quality and the smallest allowed size this stays > 10 KB.
    const result = await compressToTarget({
      targetBytes: 10 * 1024,
      width: 4000,
      height: 3000,
      encode: async () => ({ size: 999_999 }),
      sizeOf: (v) => v.size,
    });
    expect(result.meetsTarget).toBe(false);
    expect(result.best.size).toBe(999_999);
  });

  it("throws when the encoder fails", async () => {
    await expect(
      compressToTarget({
        targetBytes: 100 * 1024,
        width: 800,
        height: 600,
        encode: async () => null,
        sizeOf: () => 0,
      }),
    ).rejects.toThrow("ENCODER_FAILED");
  });
});
