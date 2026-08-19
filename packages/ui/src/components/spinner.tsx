import { cn } from "@atlas/ui/lib/utils";
import { LoaderCircle } from "lucide-react";

const Spinner = ({
  className,
  strokeWidth = 2,
  ...props
}: React.ComponentProps<"svg"> & { strokeWidth?: number }) => (
  <LoaderCircle
    strokeWidth={strokeWidth}
    data-slot="spinner"
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
    role="status"
    aria-label="Loading"
    className={cn("size-4 animate-spin", className)}
    {...props}
  />
);

export { Spinner };
