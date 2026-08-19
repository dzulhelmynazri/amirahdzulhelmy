const JOURNEY_TOOLKITS = ["googlecalendar", "gmail", "google_maps"] as const;

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
