import { auth } from "@atlas/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Auth from "@/components/auth";

/**
 * Reading the session means reading headers, which cannot be prerendered.
 *
 * Blocking rather than streaming, deliberately. Wrapping the check in Suspense
 * would paint the sign-in form first and redirect afterwards, so anyone
 * already signed in would see a login screen flash before being sent on. A
 * gate has to know who is at the door before it opens.
 */
export const instant = false;

export default async function AuthPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/activity");
  }

  return <Auth />;
}
