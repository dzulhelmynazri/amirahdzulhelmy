import { env } from "@atlas/env/server";

import { AtlasClient } from "./client";
import {
  createFlightSearch,
  createFlightVerify,
  createSeatAndBaggage,
  createBaggage,
  createOrder,
  createConfirmOrder,
  createPaymentAndTicketing,
  createQueryOrder,
  createSmartSearch,
  createGetOffer,
  createGetOfferPrice,
  createPriceCompareSearch,
} from "./flights";
import {
  createExtractPnr,
  createOrderList,
  createPnrClaim,
  createPostTicketingAncillaries,
  createRefunds,
  createRegenerateOrder,
  createStopTicketIssuance1,
  createVoid,
} from "./post-booking";
import {
  createAtripToken,
  createBalance,
  createEmailQuery,
  createRouteExport,
} from "./utility";
import { createWebhook } from "./webhook";

export const createAtlasClient = () => {
  const client = new AtlasClient({
    apiUrl: env.ATLAS_API_URL,
    clientId: env.ATLAS_CLIENT_ID,
    clientSecret: env.ATLAS_CLIENT_SECRET,
  });

  return {
    client,
    flights: {
      baggage: createBaggage(client),
      confirmOrder: createConfirmOrder(client),
      getOffer: createGetOffer(client),
      getOfferPrice: createGetOfferPrice(client),
      order: createOrder(client),
      paymentAndTicketing: createPaymentAndTicketing(client),
      priceCompareSearch: createPriceCompareSearch(client),
      queryOrder: createQueryOrder(client),
      search: createFlightSearch(client),
      seatAndBaggage: createSeatAndBaggage(client),
      smartSearch: createSmartSearch(client),
      verify: createFlightVerify(client),
    },
    postBooking: {
      extractPnr: createExtractPnr(client),
      orderList: createOrderList(client),
      pnrClaim: createPnrClaim(client),
      postTicketingAncillaries: createPostTicketingAncillaries(client),
      refunds: createRefunds(client),
      regenerateOrder: createRegenerateOrder(client),
      stopTicketIssuance1: createStopTicketIssuance1(client),
      void: createVoid(client),
    },
    utility: {
      atripToken: createAtripToken(client),
      balance: createBalance(client),
      emailQuery: createEmailQuery(client),
      routeExport: createRouteExport(client),
    },
    webhook: createWebhook(client),
  };
};
