import type { AuthFn } from "eve/channels/auth";

export const trustAtlasAgentForwarder = (forwarder: {
  authenticator: string;
}): boolean =>
  forwarder.authenticator === "local-dev" || forwarder.authenticator === "oidc";

export const betterAuth: AuthFn<Request> = async (request) => {
  const { auth } = await import("@atlas/auth");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return null;
  }

  const attributes: Record<string, string> = {
    email: session.user.email,
    name: session.user.name,
  };
  if (session.user.image) {
    attributes.picture = session.user.image;
  }

  return {
    attributes,
    authenticator: "better-auth",
    issuer: "atlas",
    principalId: session.user.id,
    principalType: "user",
  };
};
