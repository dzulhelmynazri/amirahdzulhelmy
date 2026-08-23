const LOCALE = "en-US";

type DateInput = Date | number | string;

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

const fullDateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

/** Formats a date as "Aug 23, 2026". */
export const formatDate = (value: DateInput): string =>
  dateFormatter.format(new Date(value));

/** Formats a date as "Aug 23". */
export const formatShortDate = (value: DateInput): string =>
  shortDateFormatter.format(new Date(value));

/** Formats a date and time as "Aug 23, 4:05 PM". */
export const formatDateTime = (value: DateInput): string =>
  dateTimeFormatter.format(new Date(value));

/** Formats a date and time as "Aug 23, 2026, 4:05 PM". */
export const formatFullDateTime = (value: DateInput): string =>
  fullDateTimeFormatter.format(new Date(value));
