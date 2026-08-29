import { defineTool } from "eve/tools";
import { z } from "zod";

import { resolveTravellerOwner } from "../lib/travellers";

export default defineTool({
  description:
    "List the saved traveller profiles for this account, with the details create-order needs: name, date of birth, gender, and travel document. Call this BEFORE asking the traveller for passenger details — most of the time the answer is already here. Read-only.",
  async execute(_input, context) {
    const owner = resolveTravellerOwner(context);

    if (!owner) {
      return {
        note: "No signed-in account, so no saved travellers are visible. Ask the traveller for passenger details as usual.",
        travellers: [],
      };
    }

    const { db } = await import("@atlas/db");
    const { traveller } = await import("@atlas/db/schema/travellers");
    const { desc, eq } = await import("drizzle-orm");

    const rows = await db
      .select()
      .from(traveller)
      .where(eq(traveller.userId, owner.userId))
      .orderBy(desc(traveller.isPrimary), desc(traveller.createdAt));

    return {
      note:
        rows.length === 0
          ? "No travellers saved yet. Ask for passenger details, and mention they can be saved on the Profile page so this is only needed once."
          : "Confirm which of these to book for before creating an order. Never invent or alter a name — it must match the travel document exactly.",
      travellers: rows.map((row) => ({
        birthday: row.birthday,
        documentExpiry: row.documentExpiry,
        documentIssuePlace: row.documentIssuePlace,
        documentNumber: row.documentNumber,
        email: row.email,
        gender: row.gender,
        isDefault: row.isPrimary,
        name: row.name,
        nationality: row.nationality,
        phone: row.phone,
      })),
    };
  },
  inputSchema: z.object({}),
});
