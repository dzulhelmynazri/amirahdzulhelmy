import { auth } from "@atlas/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Auth from "@/components/auth";

export default async function AuthPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/activity");
  }

  return <Auth />;
}
