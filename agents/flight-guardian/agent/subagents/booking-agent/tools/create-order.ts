import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";
import {
  contactsFromOrderInput,
  rememberConfirmationContacts,
} from "../lib/confirmation-email";
import {
  assertOrderCreated,
  toAtlasContact,
  toAtlasPassengers,
} from "../lib/passengers";

export default defineTool({
  approval: once(),
  description:
    "Create a flight booking order from a verified offer on the Atlas booking API. Requires the sessionId and routingIdentifier returned by verification, plus passenger details. Call at most once per order and never retry automatically; payment is a separate step that always needs explicit user confirmation.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.flights.order.create({
      ...input,
      contact: toAtlasContact(input.contact),
      passengers: toAtlasPassengers(input.passengers),
    });
    assertOrderCreated(result);
    await persistBooking(context, "created", result);
    // Atlas returns contactEmail blank, so the addresses the traveller gave us
    // are only available here. Parked on the booking for the payment step,
    // which is where the confirmation is worth sending.
    await rememberConfirmationContacts(
      context,
      result,
      contactsFromOrderInput(input)
    );
    return result;
  },
  inputSchema: z.object({
    contact: z
      .looseObject({
        email: z.string().describe("Contact email address"),
        mobile: z
          .string()
          .describe("Contact mobile with country code, e.g. 0060-123456789"),
        name: z
          .string()
          .describe("Contact name in uppercase FAMILY/GIVEN format"),
      })
      .describe(
        "Who the airline contacts about this booking. Required — an order without it is rejected. Usually the lead passenger; take the details from their saved traveller profile."
      ),
    passengers: z
      .array(
        z.looseObject({
          birthday: z
            .string()
            .describe("Date of birth, YYYY-MM-DD. Never guess it."),
          cardExpired: z
            .string()
            .optional()
            .describe("Travel document expiry, YYYY-MM-DD"),
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
            .describe("One of: adult, child, infant"),
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
