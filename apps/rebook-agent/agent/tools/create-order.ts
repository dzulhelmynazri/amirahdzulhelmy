import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Create a flight booking order from a verified offer on the Atlas booking API. Requires the sessionId and routingIdentifier returned by verification, plus passenger details. Call at most once per order and never retry automatically; payment is a separate step that always needs explicit user confirmation.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.flights.order.create(input);
    await persistBooking(context, "created", result);
    return result;
  },
  inputSchema: z.object({
    contact: z
      .looseObject({
        email: z.string().describe("Contact email address"),
        mobile: z
          .string()
          .describe("Contact mobile in 00{country_code}-{local_number} format"),
        name: z
          .string()
          .describe("Contact name in uppercase FAMILY/GIVEN format"),
      })
      .optional()
      .describe("Order contact; name is required, email and mobile optional"),
    passengers: z
      .array(
        z.looseObject({
          birthday: z.string().describe("Date of birth in YYYY-MM-DD format"),
          cardExpired: z
            .string()
            .optional()
            .describe("Travel document expiry in YYYY-MM-DD format"),
          cardIssuePlace: z
            .string()
            .optional()
            .describe("Travel document issuing country, ISO-2 code"),
          cardNum: z.string().optional().describe("Travel document number"),
          email: z.string().optional().describe("Passenger email address"),
          gender: z.enum(["F", "M"]).describe("Passenger gender"),
          name: z
            .string()
            .describe("Passenger name in uppercase FAMILY/GIVEN format"),
          nationality: z
            .string()
            .optional()
            .describe("Nationality, ISO-2 code"),
          passengerType: z
            .union([z.string(), z.number()])
            .describe(
              "Passenger type as returned by search or verify (adult, child, or infant)"
            ),
          phone: z.string().optional().describe("Passenger phone number"),
        })
      )
      .min(1)
      .describe("Passengers to book, one entry per traveler"),
    routingIdentifier: z
      .string()
      .describe("Routing identifier of the selected verified offer"),
    sessionId: z.string().describe("Session ID returned by the verify step"),
  }),
});
