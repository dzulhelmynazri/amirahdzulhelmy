/**
 * Re-exported from `@atlas/atlas-client`.
 *
 * These conversions were duplicated in both booking agents, which meant a fix
 * landed in one and not the other. They belong beside the API client they
 * exist to satisfy, and they are covered by tests there.
 */
export {
  assertOrderCreated,
  toAtlasContact,
  toAtlasPassengers,
} from "@atlas/atlas-client/wire-format";
