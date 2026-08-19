import { Badge } from "@atlas/ui/components/badge";
import { Button } from "@atlas/ui/components/button";
import { Google, Telegram } from "@atlas/ui/components/socials";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const handleGoogleSignIn = async () => {
  await authClient.signIn.social({
    callbackURL: "/trips",
    provider: "google",
  });
};

const handleTelegramSignIn = async () => {
  await authClient.signInWithTelegramOIDC({
    callbackURL: "/trips",
  });
};

export default function Auth() {
  const { isPending } = authClient.useSession();
  const lastMethod = authClient.getLastUsedLoginMethod();

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="mx-auto w-full max-w-md space-y-4 p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold">Alibaba Cloud x Atlas</h1>
        <p className="mb-6 text-gray-600">
          Sign in to your account to continue
        </p>
        <div className="space-y-3">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full gap-2 relative"
            variant="outline"
          >
            <Google className="size-4" />
            Continue with Google
            {lastMethod === "google" && (
              <Badge variant="secondary" className="absolute -top-2 -right-3">
                Last used
              </Badge>
            )}
          </Button>
          <Button
            onClick={handleTelegramSignIn}
            className="w-full gap-2 relative"
            variant="outline"
          >
            <Telegram className="size-4" />
            Continue with Telegram
            {lastMethod === "telegram" && (
              <Badge variant="secondary" className="absolute -top-2 -right-3">
                Last used
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
