/**
 * Currency formatting utilities.
 *
 * Uses `Intl.NumberFormat` with the user's stored currency code
 * (e.g. "USD", "EUR"). Falls back to "USD" if the code is invalid.
 */

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  const cached = formatterCache.get(currency);
  if (cached) return cached;

  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(currency, formatter);
    return formatter;
  } catch {
    // Invalid currency code — fall back to USD
    const fallback = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(currency, fallback);
    return fallback;
  }
}

/**
 * Format a number as a currency string.
 *
 * @param amount  The numeric value (always positive in our DB)
 * @param currency  ISO 4217 currency code from `profiles.currency`
 * @returns Formatted string, e.g. "$1,234.56"
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return getFormatter(currency).format(amount);
}

/**
 * Round a numeric string to 2 decimal places.
 * Used by budget inputs to match DB `numeric(12,2)`.
 */
export function roundAmount(value: string): number {
  const n = parseFloat(value);
  if (isNaN(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Format a number as a compact currency (no decimals for whole numbers).
 * Useful for summary cards where precision is less important.
 *
 * @param amount  The numeric value
 * @param currency  ISO 4217 currency code
 * @returns Formatted string, e.g. "$1,235" or "$1,234.50"
 */
export function formatCurrencyCompact(
  amount: number,
  currency = "USD"
): string {
  const isWhole = amount === Math.floor(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
