import { Suspense } from 'react';
import type { ReactNode } from 'react';

import { TripsSidebar } from "@/components/trips-sidebar";

export default function TripsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 -mb-4 flex h-[calc(100%+1rem)]">
      {/* Marks the open trip, so it reads the URL and cannot be prerendered. */}
      <Suspense fallback={null}>
        <TripsSidebar />
      </Suspense>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
