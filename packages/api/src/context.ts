import { auth } from "@atlas/auth";
import type { NextRequest } from "next/server";

export const createContext = async (req: NextRequest) => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return {
    auth: null,
    origin: req.nextUrl.origin,
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
