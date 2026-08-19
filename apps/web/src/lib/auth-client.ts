import { telegramClient } from "better-auth-telegram/client";
import { lastLoginMethodClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [telegramClient(), lastLoginMethodClient()],
});
