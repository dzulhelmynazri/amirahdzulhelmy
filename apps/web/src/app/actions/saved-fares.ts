"use server";

import type { NormalizedFare } from "@atlas/atlas-client/fare-compare/types";
import { auth } from "@atlas/auth";
import { db } from "@atlas/db";
import { savedFare } from "@atlas/db/schema/fares";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * Saving a fare stores a **snapshot**, not a bookable offer. Atlas expires
 * `routingIdentifier`, so a saved row goes stale — re-search and verify before
 * anyone tries to buy it.
 */

export interface SaveFareResult {
  error?: string;
  id?: string;
}

const requireUserId = async (): Promise<string | undefined> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
};

export const saveFare = async (
  fare: NormalizedFare,
  searchId?: string
): Promise<SaveFareResult> => {
  const userId = await requireUserId();

  if (!userId) {
    return { error: "You need to be signed in to save a fare." };
  }

  const id = crypto.randomUUID();

  try {
    await db.insert(savedFare).values({
      airline: fare.airline,
      baggageIncluded: fare.baggage.included,
      currency: fare.currency,
      flightNumbers: fare.flightNumbers.join(" "),
      id,
      priceAtSave: fare.adultTotal.toFixed(2),
      stops: fare.stops,
      userId,
      ...(fare.cabin === undefined ? {} : { cabin: fare.cabin }),
      ...(fare.routingIdentifier === undefined
        ? {}
        : { routingIdentifier: fare.routingIdentifier }),
      ...(searchId === undefined ? {} : { searchId }),
    });

    return { id };
  } catch {
    return { error: "Could not save that fare. Please try again." };
  }
};

export const removeSavedFare = async (id: string): Promise<SaveFareResult> => {
  const userId = await requireUserId();

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  try {
    // Scoped to the owner so an id alone cannot delete someone else's row.
    await db
      .delete(savedFare)
      .where(and(eq(savedFare.id, id), eq(savedFare.userId, userId)));
    return {};
  } catch {
    return { error: "Could not remove that fare." };
  }
};

export const listSavedFares = async () => {
  const userId = await requireUserId();

  if (!userId) {
    return [];
  }

  try {
    return await db
      .select()
      .from(savedFare)
      .where(eq(savedFare.userId, userId))
      .orderBy(desc(savedFare.createdAt));
  } catch {
    return [];
  }
};
