import type { ToolContext } from "eve/tools";

/**
 * Resolves whose travellers the agent may read.
 *
 * In the browser, better-auth puts a real user id on the session and that is
 * the only identity used. The terminal has no cookie, so `eve dev` falls back
 * to `local-dev` with no user attached — which would make every traveller
 * lookup come back empty.
 *
 * `ATLAS_DEV_USER_ID` exists for that case only. It has to be set by hand in a
 * local `.env`, and it is never consulted when a verified user is present, so
 * it cannot widen access in production. Without it, an unauthenticated caller
 * simply gets nothing.
 */
export const resolveTravellerOwner = (
  context: ToolContext
): { source: "dev-env" | "session"; userId: string } | null => {
  const auth = context.session.auth.current ?? context.session.auth.initiator;
  const isBetterAuthUser = auth?.authenticator.toLowerCase().includes("better");

  if (isBetterAuthUser && auth) {
    return { source: "session", userId: auth.principalId };
  }

  const devUserId = process.env.ATLAS_DEV_USER_ID;

  return devUserId ? { source: "dev-env", userId: devUserId } : null;
};

/** Atlas wants `FAMILY/GIVEN`, uppercase, as printed on the document. */
const NAME_PATTERN = /^[A-Z][A-Z ]*\/[A-Z][A-Z ]*$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ISO2_PATTERN = /^[A-Z]{2}$/u;

/**
 * Rewrites a phone number into the one spelling Atlas accepts,
 * `00{callingCode}-{local}`.
 *
 * A traveller types "60-123456789" or "+60 12 345 6789" and the model passes
 * it straight through, because that is what it was given. Stored as-is, the
 * number is one neither Atlas nor the profile form can read, so the field
 * looks empty on the next visit and the booking is submitted with a phone
 * number the airline rejects.
 *
 * The separator is required. Without it there is no way to tell where the
 * country code ends, and a guess would corrupt the number.
 */
const digitsOnly = (part: string) => part.replaceAll(/\D/gu, "");

export const normalisePhone = (value: string): string | undefined => {
  const separator = value.indexOf("-");

  if (separator === -1) {
    return;
  }

  // Leading zeros are the international prefix, never part of a calling code.
  const callingCode = digitsOnly(value.slice(0, separator)).replace(/^0+/u, "");
  const local = digitsOnly(value.slice(separator + 1));

  return callingCode && local ? `00${callingCode}-${local}` : undefined;
};

export interface TravellerDraft {
  birthday: string;
  documentExpiry?: string;
  documentIssuePlace?: string;
  documentNumber?: string;
  email?: string;
  gender: string;
  name: string;
  nationality?: string;
  phone?: string;
}

/**
 * Rejects anything an airline would reject, before it reaches the database.
 * A model asked for a passenger name will happily "tidy" one; a tidied name is
 * a denied boarding, so the format is enforced rather than trusted.
 */
export const validateDraft = (draft: TravellerDraft): string | undefined => {
  if (!NAME_PATTERN.test(draft.name)) {
    return "Name must be uppercase FAMILY/GIVEN, exactly as printed on the travel document — e.g. TAN/MEI LING. Ask the traveller rather than guessing the split.";
  }
  if (!ISO_DATE_PATTERN.test(draft.birthday)) {
    return "Date of birth must be YYYY-MM-DD.";
  }
  if (draft.gender !== "F" && draft.gender !== "M") {
    return "Gender must be F or M — the only values airlines accept here.";
  }
  if (
    draft.documentExpiry !== undefined &&
    !ISO_DATE_PATTERN.test(draft.documentExpiry)
  ) {
    return "Document expiry must be YYYY-MM-DD.";
  }
  for (const value of [draft.nationality, draft.documentIssuePlace]) {
    if (value !== undefined && !ISO2_PATTERN.test(value)) {
      return "Country codes must be 2 letters, e.g. MY.";
    }
  }
  if (draft.phone !== undefined && normalisePhone(draft.phone) === undefined) {
    return "Phone must include the country code and a dash, e.g. 0060-123456789. Ask rather than guessing where the code ends.";
  }
};
