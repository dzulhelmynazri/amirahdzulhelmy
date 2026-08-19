import { defineComposioTools } from "@composio/experimental/eve";

import { getComposioSession } from "../lib/composio";

export default defineComposioTools((ctx) => {
  const sessionUserId = ctx.session.auth.current?.principalId;
  const isSyntheticPrincipal =
    sessionUserId === undefined ||
    sessionUserId === "local-dev" ||
    sessionUserId === "anonymous";
  const userId = isSyntheticPrincipal
    ? process.env.COMPOSIO_EVAL_USER_ID
    : sessionUserId;
  if (!userId) {
    throw new Error("User ID not found in session");
  }
  return getComposioSession(userId);
});
