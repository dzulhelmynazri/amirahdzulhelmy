import type { ToolContext } from "eve/tools";

/**
 * Writes trip documents to the same `trip` table `/trips` already reads.
 *
 * The editor there stores a Plate (Slate) node tree in `content` and restores
 * it verbatim, so the shape is not ours to improvise. A malformed tree does
 * not fail loudly — it makes the editor throw `Unable to find the path for
 * Slate node` when the traveller opens the document, which is a broken page
 * blamed on the page rather than on whatever wrote it.
 *
 * So the model never supplies nodes. It supplies headings and lines, and the
 * builders below turn those into the handful of node types the trips editor
 * actually loads (`BasicBlocksKit` and `ListKit`). Anything richer than that
 * would be a node type with no plugin behind it.
 */

interface TextNode {
  text: string;
}

interface BlockNode {
  children: TextNode[];
  indent?: number;
  listStyleType?: string;
  type: string;
}

export interface ItinerarySection {
  heading: string;
  items: string[];
}

const paragraph = (text: string): BlockNode => ({
  children: [{ text }],
  type: "p",
});

const heading = (text: string): BlockNode => ({
  children: [{ text }],
  type: "h2",
});

/**
 * `@platejs/list` is indent-based: a bullet is a paragraph carrying a list
 * style, not an `li` inside a `ul`. Emitting `ul`/`li` would produce nodes no
 * plugin claims, and they render as nothing.
 */
const bullet = (text: string): BlockNode => ({
  children: [{ text }],
  indent: 1,
  listStyleType: "disc",
  type: "p",
});

export const buildItinerary = (input: {
  sections: readonly ItinerarySection[];
  summary?: string;
}): BlockNode[] => {
  const nodes: BlockNode[] = [];

  // No h1 for the title. The trip carries its own `title` column and the
  // sidebar already shows it; repeating it as the first line is duplication
  // the traveller then has to keep in sync by hand.
  if (input.summary) {
    nodes.push(paragraph(input.summary));
  }

  for (const section of input.sections) {
    nodes.push(heading(section.heading));
    for (const item of section.items) {
      nodes.push(bullet(item));
    }
  }

  // Somewhere to put the cursor that is not inside a bullet, so the first
  // thing typed after opening the document does not join the last list item.
  nodes.push(paragraph(""));

  return nodes;
};

/**
 * The signed-in user, or null.
 *
 * `ATLAS_DEV_USER_ID` covers `eve dev`, where no browser session reaches the
 * agent. It is never consulted when a verified user is present.
 */
const resolveUserId = (context: ToolContext): string | null => {
  const auth = context.session.auth.current ?? context.session.auth.initiator;

  if (auth?.authenticator.toLowerCase().includes("better")) {
    return auth.principalId;
  }

  return process.env.ATLAS_DEV_USER_ID ?? null;
};

export interface CreatedTrip {
  id: string;
  title: string;
}

/**
 * Refuses rather than writing an unowned row.
 *
 * `/trips` lists strictly by `userId`, so a trip saved without one exists in
 * the table and nowhere else. The traveller would be told their itinerary was
 * created and then not find it, which is worse than being told it failed.
 */
export const persistTrip = async (
  context: ToolContext,
  input: { content: BlockNode[]; title: string }
): Promise<CreatedTrip | null> => {
  const userId = resolveUserId(context);

  if (!userId) {
    return null;
  }

  const { db } = await import("@atlas/db");
  const { trip } = await import("@atlas/db/schema/trips");

  const [row] = await db
    .insert(trip)
    .values({
      content: input.content,
      id: crypto.randomUUID(),
      title: input.title,
      userId,
    })
    .returning({ id: trip.id, title: trip.title });

  return row ?? null;
};
