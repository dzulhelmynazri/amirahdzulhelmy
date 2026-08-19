"use client";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

const TITLE_TEXT = `AmirahDzulhelmy`;

const Home = () => {
  const healthCheck = useQuery(trpc.health.check.queryOptions());

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`size-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-muted-foreground">
              {(() => {
                if (healthCheck.isLoading) {
                  return "Checking...";
                }
                if (healthCheck.data) {
                  return "Connected";
                }
                return "Disconnected";
              })()}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
export default Home;
