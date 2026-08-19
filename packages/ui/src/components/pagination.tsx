import { Button } from "@atlas/ui/components/button";
import { cn } from "@atlas/ui/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    data-slot="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);

const PaginationContent = ({
  className,
  ...props
}: React.ComponentProps<"ul">) => (
  <ul
    data-slot="pagination-content"
    className={cn("flex items-center gap-1", className)}
    {...props}
  />
);

const PaginationItem = ({ ...props }: React.ComponentProps<"li">) => (
  <li data-slot="pagination-item" {...props} />
);

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <Button
    variant={isActive ? "outline" : "ghost"}
    size={size}
    className={cn(className)}
    nativeButton={false}
    render={
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      <a
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        {...props}
      />
    }
  />
);

const PaginationPrevious = ({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("pl-2!", className)}
    {...props}
  >
    <ChevronLeft strokeWidth={2} data-icon="inline-start" />
    <span className="hidden sm:block">{text}</span>
  </PaginationLink>
);

const PaginationNext = ({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("pr-2!", className)}
    {...props}
  >
    <span className="hidden sm:block">{text}</span>
    <ChevronRight strokeWidth={2} data-icon="inline-end" />
  </PaginationLink>
);

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    data-slot="pagination-ellipsis"
    className={cn(
      "flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  >
    <MoreHorizontal strokeWidth={2} />
    <span className="sr-only">More pages</span>
  </span>
);

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
