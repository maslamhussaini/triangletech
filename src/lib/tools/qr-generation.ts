/**
 * QR encoding wrapper around the `qrcode` package (MIT, v1.5.4).
 *
 * This is the only module that touches the QR library. It always passes
 * an explicit quiet-zone margin (4 modules, the QR spec minimum) and
 * the caller's error-correction level and colours. Encoder errors —
 * including capacity overflow — are returned as user-facing messages,
 * never swallowed into a blank image.
 */
import QRCode from "qrcode";
import {
  QUIET_ZONE_MODULES,
  checkCapacity,
  type ErrorCorrectionLevel,
} from "./qr-code";

export interface QrRenderOptions {
  errorCorrectionLevel: ErrorCorrectionLevel;
  foreground: string;
  background: string;
  /** Quiet-zone width in modules. Defaults to the spec minimum, 4. */
  margin?: number;
}

export interface QrRenderResult {
  svg: string | null;
  pngDataUrl: string | null;
  error: string | null;
}

function encoderErrorMessage(payload: string, level: ErrorCorrectionLevel, cause: unknown): string {
  const capacity = checkCapacity(payload, level);
  if (!capacity.fits) {
    return `This content is too long for error correction level ${level}: it is ${capacity.bytes} bytes and the maximum is ${capacity.maxBytes} bytes. Shorten the content or choose a lower error correction level.`;
  }
  const detail = cause instanceof Error ? cause.message : "";
  if (/too big|code length overflow/i.test(detail)) {
    return `This content is too long to fit in a QR code at error correction level ${level}. Shorten the content or choose a lower error correction level.`;
  }
  return "The QR code could not be generated for this content. Shorten it or check the entries and try again.";
}

export async function generateQrSvg(payload: string, options: QrRenderOptions): Promise<{ svg: string | null; error: string | null }> {
  if (!payload) return { svg: null, error: "Nothing to encode yet." };
  const capacity = checkCapacity(payload, options.errorCorrectionLevel);
  if (!capacity.fits) return { svg: null, error: encoderErrorMessage(payload, options.errorCorrectionLevel, null) };
  try {
    const svg = await QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: options.margin ?? QUIET_ZONE_MODULES,
      color: { dark: options.foreground, light: options.background },
    });
    return { svg, error: null };
  } catch (cause) {
    return { svg: null, error: encoderErrorMessage(payload, options.errorCorrectionLevel, cause) };
  }
}

export async function generateQrPngDataUrl(
  payload: string,
  options: QrRenderOptions & { width: number },
): Promise<{ dataUrl: string | null; error: string | null }> {
  if (!payload) return { dataUrl: null, error: "Nothing to encode yet." };
  const capacity = checkCapacity(payload, options.errorCorrectionLevel);
  if (!capacity.fits) return { dataUrl: null, error: encoderErrorMessage(payload, options.errorCorrectionLevel, null) };
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: options.margin ?? QUIET_ZONE_MODULES,
      width: options.width,
      color: { dark: options.foreground, light: options.background },
    });
    return { dataUrl, error: null };
  } catch (cause) {
    return { dataUrl: null, error: encoderErrorMessage(payload, options.errorCorrectionLevel, cause) };
  }
}

/** Generate both renderings the UI needs in one call. */
export async function generateQr(payload: string, options: QrRenderOptions & { width: number }): Promise<QrRenderResult> {
  const [svgResult, pngResult] = await Promise.all([
    generateQrSvg(payload, options),
    generateQrPngDataUrl(payload, options),
  ]);
  return {
    svg: svgResult.svg,
    pngDataUrl: pngResult.dataUrl,
    error: svgResult.error ?? pngResult.error,
  };
}

/** Turn an SVG string into a downloadable data URL without ever
 *  injecting it into the page as markup. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
