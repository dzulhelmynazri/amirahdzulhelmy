"use server";

import { auth } from "@atlas/auth";
import { env } from "@atlas/env/server";
import { env as envWeb } from "@atlas/env/web";
import { Composio } from "@composio/core";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY });

export const connectIntegration = async (toolkitSlug: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const composioSession = await composio.create(session.user.id);

  const connectionRequest = await composioSession.authorize(toolkitSlug, {
    callbackUrl: `${envWeb.NEXT_PUBLIC_APP_URL}/integrations`,
  });

  if (!connectionRequest.redirectUrl) {
    throw new Error("Failed to generate Composio connection URL");
  }

  redirect(connectionRequest.redirectUrl);
};

export const disconnectIntegration = async (toolkitSlug: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const accounts = await composio.connectedAccounts.list({
    userIds: [session.user.id],
  });

  // Find all accounts matching the toolkit slug that are ACTIVE or INITIATED
  const targetAccounts = accounts.items.filter(
    (a) =>
      a.toolkit.slug === toolkitSlug &&
      (a.status === "ACTIVE" || a.status === "INITIATED")
  );

  // Disconnect all of them to ensure single-account mode cleans up any duplicates
  await Promise.all(
    targetAccounts.map((account) =>
      composio.connectedAccounts.delete(account.id)
    )
  );
};

export const getConnectedIntegrations = async () => {
  noStore();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const accounts = await composio.connectedAccounts.list({
    userIds: [session.user.id],
  });

  return (
    accounts.items
      // Telegram might be INITIATED if it requires first message
      .filter((a) => a.status === "ACTIVE" || a.status === "INITIATED")
      .map((a) => a.toolkit.slug)
  );
};
