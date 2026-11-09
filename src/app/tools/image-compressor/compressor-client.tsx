"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkImageIntegrity,
  compressToTarget,
  downloadFileName,
  formatBytes,
  meetsTarget,
  reductionPercent,
  validateImageDimensions,
  validateImageFile,
  validateTargetKb,
  PRESET_TARGET_KB,
  type Dimensions,
  type OutputFormat,
} from "@/lib/tools/image-compressor";

interface SourceState {
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  url: string;
  hasAlpha: boolean;
}

interface ResultState {
  url: string;
  size: number;
  width: number;
  height: number;
  quality: number;
  scale: number;
  meetsTarget: boolean;
  fileName: string;
  format: OutputFormat;
}

type Drawable = ImageBitmap | HTMLImageElement;

async function decodeImage(file: File): Promise<{ drawable: Drawable; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies EXIF orientation so phone photos are not rotated.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { drawable: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return { drawable: bitmap, width: bitmap.width, height: bitmap.height };
      } catch {
        // Fall through to the <img> path below.
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { drawable: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    // The drawable keeps its own reference once decoded; the URL is only
    // needed for loading. Preview uses a separate object URL.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Sample a small copy of the image and check for any non-opaque pixel. */
function detectAlpha(drawable: Drawable, width: number, height: number): boolean {
  try {
    const sample = document.createElement("canvas");
    const scale = Math.min(1, 48 / Math.max(width, height));
    sample.width = Math.max(1, Math.round(width * scale));
    sample.height = Math.max(1, Math.round(height * scale));
    const ctx = sample.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(drawable, 0, 0, sample.width, sample.height);
    const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function encodeWithCanvas(
  drawable: Drawable,
  sourceWidth: number,
  sourceHeight: number,
  format: OutputFormat,
) {
  return (quality: number, dims: Dimensions): Promise<Blob | null> =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      if (format === "image/jpeg") {
        // JPEG has no alpha channel: composite onto white instead of the
        // black background browsers would otherwise substitute.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, dims.width, dims.height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(drawable, 0, 0, sourceWidth, sourceHeight, 0, 0, dims.width, dims.height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type && blob.type !== format) {
            // Some browsers silently fall back to PNG instead of WebP.
            reject(new Error("FORMAT_UNSUPPORTED"));
            return;
          }
          resolve(blob);
        },
        format,
        quality,
      );
    });
}

export default function ImageCompressorClient() {
  const [source, setSource] = useState<SourceState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [targetChoice, setTargetChoice] = useState<string>("100");
  const [customKb, setCustomKb] = useState("");
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const drawableRef = useRef<Drawable | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearResult = useCallback(() => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
    setNotice(null);
  }, []);

  useEffect(() => {
    const sourceUrl = sourceUrlRef.current;
    const resultUrl = resultUrlRef.current;
    const drawable = drawableRef.current;
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      if (drawable instanceof ImageBitmap) drawable.close();
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setAnnouncement("");
      clearResult();

      const fileError = validateImageFile({ name: file.name, size: file.size, type: file.type });
      if (fileError) {
        setError(fileError);
        return;
      }
      // Structural integrity check before decoding: browser decoders accept
      // some truncated files and silently produce a mostly blank image.
      try {
        const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
        const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 1024)).arrayBuffer());
        const integrityError = checkImageIntegrity({ size: file.size, head, tail, type: file.type, name: file.name });
        if (integrityError) {
          setError(integrityError);
          return;
        }
      } catch {
        // If the bytes cannot even be sampled, fall through: decoding will
        // produce the definitive error below.
      }
      setBusy(true);
      try {
        const decoded = await decodeImage(file);
        const dimError = validateImageDimensions(decoded.width, decoded.height);
        if (dimError) {
          if (decoded.drawable instanceof ImageBitmap) decoded.drawable.close();
          setError(dimError);
          return;
        }
        if (drawableRef.current instanceof ImageBitmap) drawableRef.current.close();
        if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
        drawableRef.current = decoded.drawable;
        const url = URL.createObjectURL(file);
        sourceUrlRef.current = url;
        const hasAlpha = file.type !== "image/jpeg" && detectAlpha(decoded.drawable, decoded.width, decoded.height);
        setSource({
          name: file.name,
          size: file.size,
          type: file.type,
          width: decoded.width,
          height: decoded.height,
          url,
          hasAlpha,
        });
        setAnnouncement(`${file.name} loaded. ${decoded.width} by ${decoded.height} pixels, ${formatBytes(file.size)}.`);
      } catch {
        setError("That image could not be read. It may be corrupted, or your browser may not support its format. Try re-exporting it as JPG or PNG and uploading again.");
      } finally {
        setBusy(false);
      }
    },
    [clearResult],
  );

  const effectiveTargetKb = targetChoice === "custom" ? Number(customKb) : Number(targetChoice);

  const handleCompress = useCallback(async () => {
    if (!source || !drawableRef.current) return;
    setError(null);
    setNotice(null);

    const targetError = validateTargetKb(effectiveTargetKb);
    if (targetError) {
      setError(targetError);
      return;
    }
    clearResult();
    setBusy(true);
    setAnnouncement("Compressing…");
    try {
      const encode = encodeWithCanvas(drawableRef.current, source.width, source.height, format);
      const outcome = await compressToTarget<Blob>({
        targetBytes: effectiveTargetKb * 1024,
        width: source.width,
        height: source.height,
        encode: (quality, dims) => encode(quality, dims),
        sizeOf: (blob) => blob.size,
      });
      const blob = outcome.best.value;
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      const met = meetsTarget(blob.size, effectiveTargetKb);
      setResult({
        url,
        size: blob.size,
        width: outcome.best.width,
        height: outcome.best.height,
        quality: outcome.best.quality,
        scale: outcome.best.scale,
        meetsTarget: met,
        fileName: downloadFileName(source.name, format, effectiveTargetKb),
        format,
      });
      if (met) {
        setAnnouncement(`Done. Compressed to ${formatBytes(blob.size)}, within your ${effectiveTargetKb} KB target.`);
      } else {
        setNotice(
          `This image could not reach ${effectiveTargetKb} KB at acceptable quality. Even at the lowest quality we allow ` +
            `(40%) and reduced to ${outcome.best.width} × ${outcome.best.height}px, the smallest result is ${formatBytes(blob.size)}. ` +
            `That usually happens with detailed photos, screenshots with lots of text, or noisy images. ` +
            `You can still download this smallest version, or try a larger target.`,
        );
        setAnnouncement(`Finished, but the ${effectiveTargetKb} KB target was not reached. Smallest acceptable result is ${formatBytes(blob.size)}.`);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "FORMAT_UNSUPPORTED") {
        setError("Your browser could not export WebP from a canvas. Switch the output format to JPG and try again.");
      } else {
        setError("Compression failed in your browser. Try a smaller image, or reload the page and try again. Your original file was not changed.");
      }
    } finally {
      setBusy(false);
    }
  }, [source, format, effectiveTargetKb, clearResult]);

  const reset = useCallback(() => {
    clearResult();
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    sourceUrlRef.current = null;
    if (drawableRef.current instanceof ImageBitmap) drawableRef.current.close();
    drawableRef.current = null;
    setSource(null);
    setError(null);
    setAnnouncement("");
    if (inputRef.current) inputRef.current.value = "";
  }, [clearResult]);

  const reduction = result ? reductionPercent(source?.size ?? 0, result.size) : 0;

  return (
    <>
      <section className="page-intro page-intro-indigo">
        <div className="container">
          <span className="eyebrow">FREE TOOL</span>
          <h1>Image Compressor to Target KB</h1>
          <p>
            Compress a JPG, PNG or WebP image to a target size — 50, 100, 200, 500 KB or your own figure —
            and download it as JPG or WebP. Everything runs in your browser: your image is never uploaded.
          </p>
        </div>
      </section>

      <section className="section image-compressor">
        <div className="container">
          <div className="image-compressor-panel glass-panel">
            <p className="image-compressor-privacy">
              <strong>Private by design.</strong> Processing happens on your device with the browser&apos;s
              built-in image tools. No server upload, no account, no tracking of your files. Re-encoding also
              removes stored photo metadata such as location data.
            </p>

            <div
              className={`image-compressor-dropzone${dragging ? " is-dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
            >
              <label htmlFor="image-compressor-input" className="image-compressor-dropzone-label">
                <span className="image-compressor-dropzone-title">
                  {source ? source.name : "Drop an image here, or choose a file"}
                </span>
                <span className="image-compressor-dropzone-note">
                  JPG, PNG or WebP, up to 25 MB and 40 megapixels.
                  {source ? ` Current image: ${source.width} × ${source.height}px · ${formatBytes(source.size)}` : ""}
                </span>
              </label>
              <input
                ref={inputRef}
                id="image-compressor-input"
                className="image-compressor-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                aria-describedby="image-compressor-input-help"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <p id="image-compressor-input-help" className="helper-premium">
                On a phone, this opens your photo library or file picker.
              </p>
            </div>

            {error && (
              <p className="lead-alert" role="alert">
                {error}
              </p>
            )}

            <div className="image-compressor-controls">
              <fieldset className="estimator-fieldset">
                <legend>Target size</legend>
                <div className="estimator-options" role="radiogroup" aria-label="Target size in kilobytes">
                  {PRESET_TARGET_KB.map((kb) => (
                    <label key={kb} className="estimator-option">
                      <input
                        type="radio"
                        name="target-kb"
                        value={String(kb)}
                        checked={targetChoice === String(kb)}
                        onChange={() => setTargetChoice(String(kb))}
                      />
                      <span>
                        <span className="estimator-option-label">{kb} KB</span>
                      </span>
                    </label>
                  ))}
                  <label className="estimator-option">
                    <input
                      type="radio"
                      name="target-kb"
                      value="custom"
                      checked={targetChoice === "custom"}
                      onChange={() => setTargetChoice("custom")}
                    />
                    <span>
                      <span className="estimator-option-label">Custom</span>
                      <span className="estimator-option-hint">10 to 10,000 KB</span>
                    </span>
                  </label>
                </div>
                {targetChoice === "custom" && (
                  <div className="field image-compressor-custom">
                    <label className="label-premium" htmlFor="custom-kb">
                      Target size (KB)
                    </label>
                    <input
                      id="custom-kb"
                      className="input-premium"
                      type="number"
                      inputMode="numeric"
                      min={10}
                      max={10000}
                      step={1}
                      value={customKb}
                      onChange={(e) => setCustomKb(e.target.value)}
                      placeholder="e.g. 150"
                    />
                  </div>
                )}
              </fieldset>

              <fieldset className="estimator-fieldset">
                <legend>Output format</legend>
                <div className="estimator-options" role="radiogroup" aria-label="Output format">
                  <label className="estimator-option">
                    <input
                      type="radio"
                      name="output-format"
                      value="image/jpeg"
                      checked={format === "image/jpeg"}
                      onChange={() => setFormat("image/jpeg")}
                    />
                    <span>
                      <span className="estimator-option-label">JPG</span>
                      <span className="estimator-option-hint">Widest compatibility. Transparent areas become white.</span>
                    </span>
                  </label>
                  <label className="estimator-option">
                    <input
                      type="radio"
                      name="output-format"
                      value="image/webp"
                      checked={format === "image/webp"}
                      onChange={() => setFormat("image/webp")}
                    />
                    <span>
                      <span className="estimator-option-label">WebP</span>
                      <span className="estimator-option-hint">Usually smaller at the same quality. Keeps transparency.</span>
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>

            {source?.hasAlpha && format === "image/jpeg" && (
              <p className="helper-premium" role="note">
                This image has transparency. JPG does not support it, so transparent areas will be filled with
                white. Choose WebP to keep them transparent.
              </p>
            )}
            {source?.hasAlpha && format === "image/webp" && (
              <p className="helper-premium" role="note">
                This image has transparency, which WebP output will preserve.
              </p>
            )}

            <div className="image-compressor-actions">
              <button
                type="button"
                className="button-indigo"
                onClick={() => void handleCompress()}
                disabled={!source || busy}
              >
                {busy && source ? "Compressing…" : "Compress image"}
              </button>
              {source && (
                <button type="button" className="button-indigo-secondary" onClick={reset} disabled={busy}>
                  Use a different image
                </button>
              )}
            </div>

            <p className="image-compressor-status" aria-live="polite" role="status">
              {announcement}
            </p>

            {source && (
              <div className="image-compressor-previews">
                <figure className="image-compressor-preview">
                  <figcaption>
                    Before — {formatBytes(source.size)} · {source.width} × {source.height}px
                  </figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local user file via object URL; next/image cannot optimise blob URLs */}
                  <img src={source.url} alt="Original image preview" />
                </figure>
                {result && (
                  <figure className="image-compressor-preview">
                    <figcaption>
                      After — {formatBytes(result.size)} · {result.width} × {result.height}px
                    </figcaption>
                    {/* eslint-disable-next-line @next/next/no-img-element -- generated blob URL; next/image cannot optimise blob URLs */}
                    <img src={result.url} alt="Compressed image preview" />
                  </figure>
                )}
              </div>
            )}

            {result && source && (
              <div className="image-compressor-result">
                <dl className="image-compressor-stats">
                  <div className="metric-card">
                    <dt>Original size</dt>
                    <dd>{formatBytes(source.size)}</dd>
                  </div>
                  <div className="metric-card">
                    <dt>Optimized size</dt>
                    <dd>{formatBytes(result.size)}</dd>
                  </div>
                  <div className="metric-card">
                    <dt>Resolution</dt>
                    <dd>
                      {source.width} × {source.height} → {result.width} × {result.height}px
                    </dd>
                  </div>
                  <div className="metric-card">
                    <dt>Reduction</dt>
                    <dd>
                      {reduction >= 0
                        ? `${reduction.toFixed(1)}% smaller`
                        : `${Math.abs(reduction).toFixed(1)}% larger than the original`}
                    </dd>
                  </div>
                </dl>

                <p className={result.meetsTarget ? "image-compressor-met" : "image-compressor-missed"}>
                  {result.meetsTarget
                    ? `Target met: ${formatBytes(result.size)} is within your ${effectiveTargetKb} KB target (quality ${Math.round(result.quality * 100)}%${result.scale < 1 ? `, resized to ${Math.round(result.scale * 100)}%` : ""}).`
                    : `Target not reached: the smallest acceptable result is ${formatBytes(result.size)}, above your ${effectiveTargetKb} KB target.`}
                </p>
                {notice && (
                  <p className="helper-premium" role="note">
                    {notice}
                  </p>
                )}

                <div className="image-compressor-actions">
                  <a className="button-indigo" href={result.url} download={result.fileName}>
                    Download {result.format === "image/jpeg" ? "JPG" : "WebP"} · {formatBytes(result.size)}
                  </a>
                </div>
                <p className="helper-premium">
                  Animated images are exported as a still image of their first frame. Your original file is
                  not changed.
                </p>
              </div>
            )}
          </div>

          {/* Future advertising region: intentionally empty and hidden.
              When ads are approved, render the ad unit inside this region
              only — never inside the tool panel above. */}
          <div className="image-compressor-ad-region" data-ad-region="image-compressor-below-tool" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}
