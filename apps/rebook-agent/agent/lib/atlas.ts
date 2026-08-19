import type { createAtlasClient } from "@atlas/atlas-client";

type AtlasClient = ReturnType<typeof createAtlasClient>;

let atlasPromise: Promise<AtlasClient> | null = null;

const loadAtlas = async (): Promise<AtlasClient> => {
  const { createAtlasClient: createClient } =
    await import("@atlas/atlas-client");
  return createClient();
};

export const getAtlasClient = (): Promise<AtlasClient> => {
  atlasPromise ??= loadAtlas();
  return atlasPromise;
};
