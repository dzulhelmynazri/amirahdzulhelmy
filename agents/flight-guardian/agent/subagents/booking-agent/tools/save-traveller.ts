import { defineTool } from "eve/tools";
import { z } from "zod";

import type { TravellerDraft } from "../lib/travellers";
import {
  normalisePhone,
  resolveTravellerOwner,
  validateDraft,
} from "../lib/travellers";

/**
 * The fields an update should write.
 *
 * Only what the caller actually supplied. Spreading the whole input would
 * blank out a passport number just because this call was about a phone number.
 */
const toPatch = (input: TravellerDraft & { phone?: string }) => ({
  ...(input.birthday === undefined ? {} : { birthday: input.birthday }),
  ...(input.documentExpiry === undefined
    ? {}
    : { documentExpiry: input.documentExpiry }),
  ...(input.documentIssuePlace === undefined
    ? {}
    : { documentIssuePlace: input.documentIssuePlace }),
  ...(input.documentNumber === undefined
    ? {}
    : { documentNumber: input.documentNumber }),
  ...(input.email === undefined ? {} : { email: input.email }),
  ...(input.gender === undefined ? {} : { gender: input.gender }),
  ...(input.nationality === undefined
    ? {}
    : { nationality: input.nationality }),
  ...(input.phone === undefined ? {} : { phone: normalisePhone(input.phone) }),
});

/**
 * Adds a traveller profile, or completes the one already saved under the same
 * name.
 *
 * The tool never accepts a traveller id. Taking one and upserting on it is how
 * a caller ends up overwriting a stranger's passport number, since a conflict
 * clause matching on the id alone never runs the owner check. Rows are found by
 * owner plus exact name instead, and every write is filtered by `userId` too.
 *
 * The name is the one field an update can never touch: it is the match key, and
 * it is also the field that must equal the travel document character for
 * character. Corrections to it belong on the Profile page, where a person can
 * see what they are changing. Deletes are not available here at all.
 *
 * The name is stored exactly as given after format validation — never
 * "corrected". A tidied name is a denied boarding.
 */
export default defineTool({
  description:
    "Save a traveller profile for this account so their passenger details do not have to be asked for again. Adds a new person, or fills in missing details on the one already saved under that exact name. Only call this after the traveller has confirmed the spelling matches their travel document. It never changes an existing name and cannot delete anyone.",
  async execute(input, context) {
    const owner = resolveTravellerOwner(context);

    if (!owner) {
      return {
        note: "No signed-in account, so nothing was saved. Continue with the details for this booking only.",
        saved: false,
      };
    }

    const invalid = validateDraft(input);

    if (invalid) {
      return { reason: invalid, saved: false };
    }

    const { db } = await import("@atlas/db");
    const { traveller } = await import("@atlas/db/schema/travellers");
    const { and, eq } = await import("drizzle-orm");

    const existing = await db
      .select({ id: traveller.id, name: traveller.name })
      .from(traveller)
      .where(eq(traveller.userId, owner.userId));

    const match = existing.find((row) => row.name === input.name);

    // On an update, silence means "leave the default alone". Recomputing it
    // here would demote whoever was already the default every time someone
    // filled in a phone number — a call that said nothing about defaults.
    // Only a brand new traveller on an empty account is promoted by default.
    const isPrimary = match
      ? input.makeDefault
      : (input.makeDefault ?? existing.length === 0);

    if (isPrimary === true) {
      await db
        .update(traveller)
        .set({ isPrimary: false })
        .where(eq(traveller.userId, owner.userId));
    }

    if (match) {
      // Scoped to the owner as well as the row, so a traveller id belonging to
      // someone else can never be reached even if one were supplied.
      await db
        .update(traveller)
        .set({
          ...toPatch(input),
          ...(isPrimary === undefined ? {} : { isPrimary }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(traveller.id, match.id), eq(traveller.userId, owner.userId))
        );

      return {
        name: input.name,
        note: "Updated the traveller already saved under that name. The name itself was left untouched — it can only be corrected on the Profile page.",
        saved: true,
        updated: true,
      };
    }

    await db.insert(traveller).values({
      birthday: input.birthday,
      documentExpiry: input.documentExpiry ?? null,
      documentIssuePlace: input.documentIssuePlace ?? null,
      documentNumber: input.documentNumber ?? null,
      email: input.email ?? null,
      gender: input.gender,
      id: crypto.randomUUID(),
      isPrimary: isPrimary === true,
      name: input.name,
      nationality: input.nationality ?? null,
      phone:
        input.phone === undefined
          ? null
          : (normalisePhone(input.phone) ?? null),
      userId: owner.userId,
    });

    return {
      isDefault: isPrimary === true,
      name: input.name,
      note: "Saved. Tell the traveller they can review or correct it on the Profile page.",
      saved: true,
      updated: false,
    };
  },
  inputSchema: z.object({
    birthday: z.string().describe("Date of birth, YYYY-MM-DD"),
    documentExpiry: z
      .string()
      .optional()
      .describe("Travel document expiry, YYYY-MM-DD"),
    documentIssuePlace: z
      .string()
      .optional()
      .describe("Document issuing country, ISO-2 code"),
    documentNumber: z.string().optional().describe("Travel document number"),
    email: z.string().optional().describe("Contact email"),
    gender: z.enum(["F", "M"]).describe("Gender as printed on the document"),
    makeDefault: z
      .boolean()
      .optional()
      .describe("Offer this person first on future bookings"),
    name: z
      .string()
      .describe(
        "Uppercase FAMILY/GIVEN, exactly as printed on the travel document. Do not reformat or correct what the traveller gave you."
      ),
    nationality: z.string().optional().describe("Nationality, ISO-2 code"),
    phone: z
      .string()
      .optional()
      .describe(
        "Contact phone with country code and a dash, e.g. 0060-123456789"
      ),
  }),
});
