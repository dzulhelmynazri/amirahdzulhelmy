import { env } from "@atlas/env/server";
import type { Composio } from "@composio/core";

let composioPromise: Promise<Composio> | null = null;

const loadComposio = async (): Promise<Composio> => {
  const { Composio: ComposioClient } = await import("@composio/core");
  return new ComposioClient({ apiKey: env.COMPOSIO_API_KEY });
};

export const getComposio = (): Promise<Composio> => {
  composioPromise ??= loadComposio();
  return composioPromise;
};
