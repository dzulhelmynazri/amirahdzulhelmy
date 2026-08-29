/**
 * Gmail is here because the instructions already told the agent to use it:
 * hotel, rail and car confirmations arrive by email and never appear in a
 * flight PNR. Read-only by policy — see the safety rules in instructions.md.
 */
const JOURNEY_TOOLKITS = ["googlecalendar", "google_maps", "gmail"] as const;

const loadComposio = async () => {
  const { Composio } = await import("@composio/core");
  const { EveProvider } = await import("@composio/experimental/eve");
  return new Composio({ provider: new EveProvider() });
};

type ComposioClient = Awaited<ReturnType<typeof loadComposio>>;

let composioPromise: Promise<ComposioClient> | null = null;

export const getComposioClient = (): Promise<ComposioClient> => {
  composioPromise ??= loadComposio();
  return composioPromise;
};

export const getComposioSession = async (userId: string) => {
  const composio = await getComposioClient();
  return composio.sessions.create(userId, {
    toolkits: [...JOURNEY_TOOLKITS],
  });
};
