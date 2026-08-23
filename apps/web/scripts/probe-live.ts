/** Throwaway: dumps the full queryOrder response to inspect seat/baggage fields. */
import { getAtlasClient } from "@atlas/api/lib/atlas";

const atlas = await getAtlasClient();
const live = await atlas.flights.queryOrder.query({
  orderNo: "TESTA20260823124011899",
});
console.log(JSON.stringify(live, null, 2).slice(0, 6000));
