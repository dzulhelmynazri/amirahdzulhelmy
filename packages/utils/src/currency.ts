const LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";

const formatters = new Map<string, Intl.NumberFormat>();

const getFormatter = (currency: string): Intl.NumberFormat => {
  const cached = formatters.get(currency);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat(LOCALE, {
    currency,
    style: "currency",
  });
  formatters.set(currency, formatter);
  return formatter;
};

/** Formats an amount as a currency string, e.g. "US$1,234.56". */
export const formatCurrency = (
  amount: number,
  currency?: string | null
): string => getFormatter(currency ?? DEFAULT_CURRENCY).format(amount);
