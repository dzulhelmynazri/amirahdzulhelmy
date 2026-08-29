import { Button } from "@atlas/ui/components/button";
import { Compass } from "lucide-react";
import Link from "next/link";

/**
 * Next's default 404 is an unstyled black page with a hairline rule, which
 * reads as a broken deployment rather than a wrong URL. This one keeps the
 * product's voice and, more usefully, offers the three places somebody who
 * mistyped a path was probably heading.
 */
const DESTINATIONS = [
  { href: "/fares", label: "Search fares" },
  { href: "/bookings", label: "My bookings" },
  { href: "/trips", label: "My trips" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <Compass className="size-10 text-muted-foreground" />

      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl">This route does not exist</h1>
        <p className="max-w-sm text-muted-foreground text-sm">
          No page at that address. Nothing is wrong with your bookings — the URL
          just does not lead anywhere.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {DESTINATIONS.map((destination) => (
          <Button
            key={destination.href}
            render={<Link href={destination.href}>{destination.label}</Link>}
            variant={destination.href === "/fares" ? "default" : "outline"}
          />
        ))}
      </div>
    </div>
  );
}
