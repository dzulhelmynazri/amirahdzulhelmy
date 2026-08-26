/**
 * Converts booking details into the exact shapes the Atlas booking API takes.
 *
 * Every rule here was established by calling the sandbox, not by reading a
 * spec, because each one fails in a way that hides its own cause:
 *
 * - `passengerType` must be numeric. `"adult"` comes back as
 *   `status 9999 "Internal error"`, which reads like an outage.
 * - Dates must be `YYYYMMDD`. `1995-06-15` is worse than an error: Atlas
 *   answers HTTP 200 with every order field null and no message at all.
 * - `contact` is required. Omitting it returns `status 307 illegal booking
 *   request param: contact`, which names the field but not the problem and
 *   reads like a malformed value rather than a missing one.
 * - Phone numbers need the `00` international prefix, so `60-123456789`
 *   is not the same number as `0060-123456789`.
 *
 * These live here rather than in a tool's schema description because a
 * description is advice a model may decline to take. Every one of the
 * failures above reached a real booking attempt while the correct format was
 * written in the schema the model was reading.
 */

const PASSENGER_TYPE_CODES: Record<string, number> = {
  0: 0,
  1: 1,
  2: 2,
  adt: 0,
  adult: 0,
  chd: 1,
  child: 1,
  inf: 2,
  infant: 2,
};

const COMPACT_DATE = /^\d{8}$/u;
const NON_DIGITS = /\D/gu;
const LEADING_ZEROS = /^0+/u;

/** `1995-06-15` and `19950615` both become `19950615`. */
export const toAtlasDate = (value: string, field: string): string => {
  const compact = value.replaceAll(NON_DIGITS, "");

  if (!COMPACT_DATE.test(compact)) {
    throw new Error(
      `${field} must be a real date — got "${value}". Ask the traveller for it as YYYY-MM-DD rather than guessing.`
    );
  }

  return compact;
};

/** Adult, child and infant are 0, 1 and 2. Words and codes both map. */
export const toPassengerTypeCode = (value: number | string): number => {
  const code = PASSENGER_TYPE_CODES[String(value).trim().toLowerCase()];

  if (code === undefined) {
    throw new Error(
      `Unknown passenger type "${value}". Use adult, child, or infant.`
    );
  }

  return code;
};

/** Calling codes are one to three digits. Anything longer is not one. */
const MAX_CALLING_CODE_DIGITS = 3;

/**
 * Rewrites a phone number into `00{callingCode}-{localNumber}`, or returns
 * undefined when it cannot tell where the country code ends.
 *
 * The dash is load-bearing and the first one wins, because calling codes run
 * one to three digits and are not prefix-free — `6`, `60` and `604` are all
 * real. Given `+60 12-345 6789` a split on the first dash yields a calling
 * code of `6012`, which is not a country, and the number written to the
 * ticket would be wrong while looking entirely plausible.
 *
 * So an implausible split is reported as undefined rather than repaired. A
 * caller that has to ask again has lost a moment; a caller handed a confidently
 * mangled number has lost the passenger's phone contact for the whole trip.
 */
export const toAtlasPhone = (value: string): string | undefined => {
  const separator = value.indexOf("-");

  if (separator === -1) {
    return;
  }

  // Leading zeros are the international prefix, never part of a calling code.
  const callingCode = value
    .slice(0, separator)
    .replaceAll(NON_DIGITS, "")
    .replace(LEADING_ZEROS, "");
  const local = value.slice(separator + 1).replaceAll(NON_DIGITS, "");

  if (!(callingCode && local) || callingCode.length > MAX_CALLING_CODE_DIGITS) {
    return;
  }

  return `00${callingCode}-${local}`;
};

interface RawPassenger {
  birthday: string;
  cardExpired?: string;
  passengerType: number | string;
}

export const toAtlasPassengers = <T extends RawPassenger>(
  passengers: T[]
): T[] =>
  passengers.map((passenger) => ({
    ...passenger,
    birthday: toAtlasDate(passenger.birthday, "Date of birth"),
    ...(passenger.cardExpired === undefined
      ? {}
      : {
          cardExpired: toAtlasDate(
            passenger.cardExpired,
            "Travel document expiry"
          ),
        }),
    passengerType: toPassengerTypeCode(passenger.passengerType),
  }));

export const toAtlasContact = <T extends { mobile?: string }>(
  contact: T
): T => {
  if (contact.mobile === undefined) {
    return contact;
  }

  const mobile = toAtlasPhone(contact.mobile);

  if (!mobile) {
    throw new Error(
      `Cannot tell where the country code ends in "${contact.mobile}". Ask for the contact number as 00{country code}-{number}, for example 0060-123456789.`
    );
  }

  return { ...contact, mobile };
};

/**
 * Atlas reports a rejected order as HTTP 200 with a null `orderNo`.
 *
 * Left alone, an agent sees a shapeless object and invents a reason for it.
 * One run blamed missing contact details, another blamed a provider outage;
 * neither was true, and both sent someone to fix a thing that was not broken.
 */
export const assertOrderCreated = (result: unknown): void => {
  const { orderNo, msg, status } = (result ?? {}) as {
    msg?: string | null;
    orderNo?: string | null;
    status?: number | null;
  };

  if (orderNo) {
    return;
  }

  throw new Error(
    `Atlas did not create the order${status ? ` (status ${status})` : ""}${
      msg ? `: ${msg}` : " and gave no reason"
    }. Do not retry automatically and do not guess at the cause — report it and stop.`
  );
};
