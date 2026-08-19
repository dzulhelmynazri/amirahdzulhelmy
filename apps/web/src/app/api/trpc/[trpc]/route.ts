import { createContext } from "@atlas/api/context";
import { appRouter } from "@atlas/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    createContext: () => createContext(req),
    endpoint: "/api/trpc",
    req,
    router: appRouter,
  });
export { handler as GET, handler as POST };
