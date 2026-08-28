import { defineTool } from "eve/tools";
import { z } from "zod";

import { buildItinerary, persistTrip } from "../lib/trips";

const SCHEMA = z.object({
  sections: z
    .array(
      z.object({
        heading: z
          .string()
          .min(1)
          .max(120)
          .describe(
            'Section heading, e.g. "Day 1 — Wednesday 3 September, arrival"'
          ),
        items: z
          .array(z.string().min(1).max(400))
          .min(1)
          .max(20)
          .describe(
            "Lines under this heading, one per bullet. Times, places and what happens — not prose paragraphs."
          ),
      })
    )
    .min(1)
    .max(20)
    .describe("Sections in the order they should appear, usually one per day"),
  summary: z
    .string()
    .max(600)
    .optional()
    .describe("Optional opening paragraph, before the first section"),
  title: z
    .string()
    .min(1)
    .max(200)
    .describe(
      'Trip title as it appears in the sidebar, e.g. "Tokyo, September"'
    ),
});

export default defineTool({
  description:
    "Create a trip document on the Atlas Trips page at /trips. Use after a booking is confirmed, or when the traveller asks for an itinerary. Write only what you actually know — flights that exist, times that were confirmed. The document is theirs to edit afterwards, so leaving a day thin is fine; inventing a restaurant is not.",
  async execute(input, context) {
    const trip = await persistTrip(context, {
      content: buildItinerary({
        sections: input.sections,
        summary: input.summary,
      }),
      title: input.title,
    });

    if (!trip) {
      return {
        reason:
          "No signed-in traveller on this session, and trips are listed strictly by owner. Saving one now would put a row in the table that never appears on /trips. Say the itinerary could not be saved.",
        saved: false,
      };
    }

    return { id: trip.id, saved: true, url: `/trips/${trip.id}` };
  },
  inputSchema: SCHEMA,
});
