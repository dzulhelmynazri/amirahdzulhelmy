const toAtlasTripType = (tripType: unknown): unknown => {
  if (tripType === "OW" || tripType === "1") {
    return "1";
  }
  if (tripType === "RT" || tripType === "2") {
    return "2";
  }
  return tripType;
};

const toAtlasDate = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.replaceAll("-", "");
};

export const toAtlasSearchBody = <T extends Record<string, unknown>>(
  input: T
): T =>
  ({
    ...input,
    fromDate: toAtlasDate(input.fromDate),
    retDate: toAtlasDate(input.retDate),
    tripType: toAtlasTripType(input.tripType),
  }) as T;
