"use server";

import { auth } from "@atlas/auth";
import { db } from "@atlas/db";
import { traveller } from "@atlas/db/schema/travellers";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { normaliseAtlasPhone } from "@/lib/countries";

/**
 * Traveller profiles: the people this account books for.
 *
 * Every write is scoped to the signed-in user, so an id alone can never reach
 * someone else's row.
 */

export interface TravellerInput {
  birthday: string;
  documentExpiry?: string;
  documentIssuePlace?: string;
  documentNumber?: string;
  email?: string;
  gender: string;
  id?: string;
  isPrimary?: boolean;
  name: string;
  nationality?: string;
  phone?: string;
}

export interface TravellerResult {
  error?: string;
  id?: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
/** Atlas wants `FAMILY/GIVEN`, uppercase, as printed on the document. */
const NAME_PATTERN = /^[A-Z][A-Z ]*\/[A-Z][A-Z ]*$/u;
const ISO2_PATTERN = /^[A-Z]{2}$/u;

const requireUserId = async (): Promise<string | undefined> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
};

const validate = (input: TravellerInput): string | undefined => {
  if (!NAME_PATTERN.test(input.name)) {
    return "Name must be uppercase FAMILY/GIVEN, e.g. TAN/MEI LING.";
  }
  if (!ISO_DATE_PATTERN.test(input.birthday)) {
    return "Date of birth must be YYYY-MM-DD.";
  }
  if (input.gender !== "F" && input.gender !== "M") {
    return "Gender must be F or M — the only values airlines accept here.";
  }
  if (
    input.documentExpiry !== undefined &&
    input.documentExpiry !== "" &&
    !ISO_DATE_PATTERN.test(input.documentExpiry)
  ) {
    return "Document expiry must be YYYY-MM-DD.";
  }
  for (const [label, value] of [
    ["Nationality", input.nationality],
    ["Issuing country", input.documentIssuePlace],
  ] as const) {
    if (value !== undefined && value !== "" && !ISO2_PATTERN.test(value)) {
      return `${label} must be a 2-letter country code, e.g. MY.`;
    }
  }
};

const optional = (value: string | undefined) =>
  value === undefined || value.trim() === "" ? null : value.trim();

const phoneOrNull = (value: string | undefined) => {
  const trimmed = optional(value);

  return trimmed === null ? null : (normaliseAtlasPhone(trimmed) ?? trimmed);
};

export const listTravellers = async () => {
  const userId = await requireUserId();

  if (!userId) {
    return [];
  }

  try {
    return await db
      .select()
      .from(traveller)
      .where(eq(traveller.userId, userId))
      .orderBy(desc(traveller.isPrimary), desc(traveller.createdAt));
  } catch {
    return [];
  }
};

/**
 * One traveller, or undefined when the id is not this account's.
 *
 * A missing row and someone else's row are deliberately indistinguishable: the
 * caller learns nothing about ids it does not own.
 */
export const getTraveller = async (id: string) => {
  const userId = await requireUserId();

  if (!userId) {
    return;
  }

  const rows = await db
    .select()
    .from(traveller)
    .where(and(eq(traveller.id, id), eq(traveller.userId, userId)))
    .limit(1)
    .catch(() => []);

  return rows[0];
};

export const saveTraveller = async (
  input: TravellerInput
): Promise<TravellerResult> => {
  const userId = await requireUserId();

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  const invalid = validate(input);

  if (invalid) {
    return { error: invalid };
  }

  const fields = {
    birthday: input.birthday,
    documentExpiry: optional(input.documentExpiry),
    documentIssuePlace: optional(input.documentIssuePlace),
    documentNumber: optional(input.documentNumber),
    email: optional(input.email),
    gender: input.gender,
    isPrimary: input.isPrimary ?? false,
    name: input.name.toUpperCase(),
    nationality: optional(input.nationality),
    // Stored in the one spelling Atlas accepts. A number written any other way
    // is one the form cannot read back, so the field looks empty on the next
    // visit even though something was saved.
    phone: phoneOrNull(input.phone),
  };

  try {
    // Only one primary per account, so clear the flag elsewhere first.
    if (fields.isPrimary) {
      await db
        .update(traveller)
        .set({ isPrimary: false })
        .where(eq(traveller.userId, userId));
    }

    // Insert and update are deliberately separate. An upsert keyed on the
    // primary key would let a caller pass someone else's traveller id and
    // overwrite their name and passport number: `onConflictDoUpdate` matches
    // on the id alone, so the owner check never runs. Ids are always minted
    // server-side, and every edit is filtered by userId.
    if (input.id === undefined) {
      const id = crypto.randomUUID();
      await db.insert(traveller).values({ ...fields, id, userId });
      return { id };
    }

    const [updated] = await db
      .update(traveller)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(traveller.id, input.id), eq(traveller.userId, userId)))
      .returning({ id: traveller.id });

    if (!updated) {
      return { error: "That traveller was not found." };
    }

    return { id: updated.id };
  } catch {
    return { error: "Could not save that traveller. Please try again." };
  }
};

export const removeTraveller = async (id: string): Promise<TravellerResult> => {
  const userId = await requireUserId();

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  try {
    await db
      .delete(traveller)
      .where(and(eq(traveller.id, id), eq(traveller.userId, userId)));
    return {};
  } catch {
    return { error: "Could not remove that traveller." };
  }
};
