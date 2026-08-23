/**
 * Coerces passenger details into the exact shapes Atlas accepts.
 *
 * Both of these were verified against the sandbox rather than inferred, because
 * both fail in ways that are easy to misread:
 *
 * - `passengerType` must be numeric. Sending `"adult"` comes back as
 *   `status 9999 "Internal error"`, which reads like an outage and is not one.
 * - Dates must be `YYYYMMDD`. Sending `1995-06-15` is worse than an error:
 *   Atlas returns HTTP 200 with every order field null and no message at all.
 *
 * Describing the format in the tool schema is not enough — a model will
 * reasonably echo back the ISO date it was given, and the traveller table
 * stores ISO dates on purpose. So the conversion happens here, at the boundary,
 * where it cannot be skipped.
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

/** `1995-06-15` and `19950615` both become `19950615`. */
const toAtlasDate = (value: string, field: string): string => {
  const compact = value.replace(NON_DIGITS, "");

  if (!COMPACT_DATE.test(compact)) {
    throw new Error(
      `${field} must be a real date — got "${value}". Ask the traveller for it as YYYY-MM-DD rather than guessing.`
    );
  }

  return compact;
};

const toPassengerTypeCode = (value: number | string): number => {
  const code = PASSENGER_TYPE_CODES[String(value).trim().toLowerCase()];

  if (code === undefined) {
    throw new Error(
      `Unknown passenger type "${value}". Use adult, child, or infant.`
    );
  }

  return code;
};

const NON_DIGITS_PHONE = /\D/gu;

const toAtlasPhone = (value: string): string => {
  const separator = value.indexOf("-");

  if (separator === -1) {
    return value;
  }

  // Leading zeros are the international prefix, never part of a calling code.
  const callingCode = value
    .slice(0, separator)
    .replaceAll(NON_DIGITS_PHONE, "")
    .replace(/^0+/u, "");
  const local = value.slice(separator + 1).replaceAll(NON_DIGITS_PHONE, "");

  return callingCode && local ? `00${callingCode}-${local}` : value;
};

/**
 * The order contact, with its phone in the shape Atlas takes.
 *
 * Atlas requires `contact` outright: omitting it comes back as
 * `status 307 illegal booking request param: contact`, which names the field
 * but not the problem, and reads like a malformed value rather than a missing
 * one. The schema marks it required for that reason; this only fixes up the
 * phone, which arrives written however the traveller said it.
 */
export const toAtlasContact = <T extends { mobile?: string }>(contact: T): T =>
  contact.mobile === undefined
    ? contact
    : { ...contact, mobile: toAtlasPhone(contact.mobile) };

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

/**
 * Atlas reports a rejected order as HTTP 200 with a null `orderNo` and no
 * message. Left alone, the agent sees a shapeless object and invents a reason
 * for it — one run blamed missing contact details, another blamed a provider
 * outage. Neither was true. Naming the failure keeps it honest.
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
