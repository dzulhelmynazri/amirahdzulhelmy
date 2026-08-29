/**
 * The agent's half of disruption handling: annotating an event the webhook
 * receiver already wrote.
 *
 * Recording lives in `@atlas/api/lib/disruptions`, next to the route that
 * receives the push. The agent never creates these rows — it explains them.
 */

/** Attaches what the agent worked out to a row the receiver already wrote. */
export const noteDisruptionHandled = async (
  eventId: string,
  note: string
): Promise<boolean> => {
  const { db } = await import("@atlas/db");
  const { disruptionEvent } = await import("@atlas/db/schema/disruptions");
  const { eq } = await import("drizzle-orm");

  const updated = await db
    .update(disruptionEvent)
    .set({ handledNote: note.slice(0, 2000), status: "reviewed" })
    .where(eq(disruptionEvent.eventId, eventId))
    .returning({ id: disruptionEvent.id });

  return updated.length > 0;
};
