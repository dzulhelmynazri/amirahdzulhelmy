import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { Skeleton } from "@atlas/ui/components/skeleton";

const bodyLineWidths = ["w-3/4", "w-1/2"];

/** Card-shaped loading skeleton mirroring the detail cards' header + body structure. */
export const CardSkeleton = ({
  action = false,
  bodyLines = 1,
}: {
  action?: boolean;
  bodyLines?: number;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-4 w-24" />
      </CardTitle>
      {action ? (
        <CardAction>
          <Skeleton className="h-3.5 w-36" />
        </CardAction>
      ) : null}
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {Array.from({ length: bodyLines }).map((_, index) => (
        <Skeleton
          className={`h-4 ${bodyLineWidths[index % 2]}`}
          key={`card-skeleton-line-${index}`}
        />
      ))}
    </CardContent>
  </Card>
);
