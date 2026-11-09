export type Currency = "USD" | "AED" | "PKR" | "GBP" | "EUR" | "SAR";

export interface ExchangeRateResult {
  base: Currency;
  quote: Currency;
  rate: number;
  date: string;
  provider: string;
}

export interface ExchangeRateError {
  message: string;
  reason: "NETWORK" | "PARSE" | "UNSUPPORTED" | "VALIDATION" | "PROVIDER";
}

export type ExchangeRateStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; result: ExchangeRateResult }
  | { state: "error"; error: ExchangeRateError };

const PROVIDER_BASE = "https://api.frankfurter.dev/v2";
const PROVIDER_NAME = "Frankfurter reference rates";

const SUPPORTED_PAIRS: Record<Currency, Currency[]> = {
  USD: ["PKR", "AED", "SAR", "GBP", "EUR"],
  AED: ["USD", "PKR", "SAR", "GBP", "EUR"],
  PKR: ["USD", "AED", "SAR", "GBP", "EUR"],
  SAR: ["USD", "AED", "PKR", "GBP", "EUR"],
  GBP: ["USD", "AED", "PKR", "SAR", "EUR"],
  EUR: ["USD", "AED", "PKR", "SAR", "GBP"],
};

export function isSupportedPair(base: Currency, quote: Currency): boolean {
  if (base === quote) return true;
  return SUPPORTED_PAIRS[base]?.includes(quote) ?? false;
}

export function convertAmount(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0;
  if (rate <= 0) return 0;
  return amount * rate;
}

export function formatConvertedCurrency(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function parseRateInput(raw: string): { value: number; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: 0, error: "Enter a rate" };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { value: 0, error: "Invalid rate" };
  if (parsed <= 0) return { value: 0, error: "Rate must be greater than 0" };
  return { value: parsed };
}

export async function fetchLatestRate(base: Currency, quote: Currency, signal?: AbortSignal): Promise<ExchangeRateResult> {
  if (!isSupportedPair(base, quote)) {
    throw new Error(`Unsupported pair: ${base} → ${quote}`);
  }

  const url = new URL(`${PROVIDER_BASE}/rate/${base}/${quote}`);
  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Provider error ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as {
    date?: string;
    base?: string;
    quote?: string;
    rate?: number;
  };

  if (!data.date || !data.base || !data.quote || !Number.isFinite(data.rate)) {
    throw new Error("Provider returned incomplete rate data");
  }

  const rate = Number(data.rate);
  if (data.base !== base || data.quote !== quote) {
    throw new Error("Provider returned unexpected currency pair");
  }
  if (rate <= 0) {
    throw new Error("Provider returned non-positive rate");
  }

  return {
    base: data.base as Currency,
    quote: data.quote as Currency,
    rate,
    date: data.date,
    provider: PROVIDER_NAME,
  };
}

export function buildConversionError(reason: ExchangeRateError["reason"], message: string): ExchangeRateError {
  return { reason, message };
}
