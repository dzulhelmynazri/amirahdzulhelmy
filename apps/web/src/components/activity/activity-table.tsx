"use client";

import { Badge } from "@atlas/ui/components/badge";
import { Button } from "@atlas/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@atlas/ui/components/hover-card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@atlas/ui/components/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@atlas/ui/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@atlas/ui/components/table";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import * as countryFlags from "country-flag-icons/react/3x2";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  categoryLabels,
  mockAlerts,
  severityLabels,
  severityRank,
  statusLabels,
} from "./activity-data";
import type {
  ActivityAlert,
  AlertCategory,
  AlertSeverity,
  AlertStatus,
} from "./activity-data";

const severityVariants: Record<
  AlertSeverity,
  "default" | "destructive" | "outline" | "secondary"
> = {
  critical: "destructive",
  high: "default",
  low: "outline",
  medium: "secondary",
};

const statusVariants: Record<AlertStatus, "ghost" | "outline" | "secondary"> = {
  active: "secondary",
  resolved: "outline",
  superseded: "ghost",
};

type FlagComponent = typeof countryFlags.JP;

const countryFlagRegistry: Record<string, FlagComponent> = { ...countryFlags };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

const features = tableFeatures({
  rowSortingFeature,
  sortFns: { alphanumeric: sortFn_alphanumeric },
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, ActivityAlert>();

const columns = columnHelper.columns([
  columnHelper.accessor("severity", {
    cell: (info) => {
      const severity = info.getValue();
      return (
        <Badge variant={severityVariants[severity]}>
          {severityLabels[severity]}
        </Badge>
      );
    },
    header: "Severity",
    sortFn: (rowA, rowB) =>
      severityRank[rowA.original.severity] -
      severityRank[rowB.original.severity],
  }),
  columnHelper.accessor("category", {
    cell: (info) => (
      <Badge variant="outline">{categoryLabels[info.getValue()]}</Badge>
    ),
    enableSorting: false,
    header: "Type",
  }),
  columnHelper.accessor("destination", {
    cell: (info) => {
      const Flag = countryFlagRegistry[info.row.original.countryCode];
      return (
        <span className="inline-flex items-center gap-2 font-medium">
          {Flag ? (
            <Flag className="h-3 w-4.5 rounded-[2px] ring-1 ring-foreground/10" />
          ) : null}
          {info.getValue()}
        </span>
      );
    },
    header: "Destination",
  }),
  columnHelper.accessor("summary", {
    cell: (info) => (
      <HoverCard>
        <HoverCardTrigger className="block max-w-60 truncate text-muted-foreground">
          {info.getValue()}
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="text-muted-foreground">{info.getValue()}</p>
        </HoverCardContent>
      </HoverCard>
    ),
    enableSorting: false,
    header: "Summary",
  }),
  columnHelper.accessor("status", {
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
      );
    },
    enableSorting: false,
    header: "Status",
  }),
  columnHelper.display({
    cell: (info) => {
      const alert = info.row.original;
      const url = new URL(alert.source);
      return (
        <HoverCard>
          <HoverCardTrigger
            className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
            render={
              <Link
                aria-label={`Open source for ${alert.destination} alert`}
                href={alert.source}
                rel="noopener noreferrer"
                target="_blank"
              />
            }
          >
            Source
          </HoverCardTrigger>
          <HoverCardContent>
            <div className="flex flex-col gap-2">
              <p className="font-medium">{url.hostname}</p>
              <p className="break-all text-muted-foreground">{alert.source}</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    },
    enableSorting: false,
    header: "Source",
    id: "source",
  }),
  columnHelper.accessor("detectedAt", {
    cell: (info) => (
      <span className="text-muted-foreground">
        {dateFormatter.format(new Date(info.getValue()))}
      </span>
    ),
    header: "Detected",
  }),
]);

const SortIcon = ({ isSorted }: { isSorted: false | "asc" | "desc" }) => {
  if (isSorted === "asc") {
    return <ArrowUp data-icon="inline-end" />;
  }
  if (isSorted === "desc") {
    return <ArrowDown data-icon="inline-end" />;
  }
  return <ArrowUpDown data-icon="inline-end" />;
};

export const ActivityTable = () => {
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | "all">(
    "all"
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: "detectedAt" },
  ]);

  const filteredAlerts = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();
    return mockAlerts.filter((alert) => {
      const matchesCategory =
        categoryFilter === "all" || alert.category === categoryFilter;
      const matchesQuery =
        query === "" ||
        alert.destination.toLowerCase().includes(query) ||
        alert.summary.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, globalFilter]);

  const table = useTable({
    columns,
    data: filteredAlerts,
    features,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const { rows } = table.getRowModel();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search alerts"
            onChange={(event) => {
              const { value } = event.target;
              setGlobalFilter(value);
            }}
            placeholder="Search destination"
            value={globalFilter}
          />
        </InputGroup>
        <NativeSelect
          aria-label="Filter by alert type"
          onChange={(event) => {
            const { value } = event.target;
            setCategoryFilter(value as AlertCategory | "all");
          }}
          value={categoryFilter}
        >
          <NativeSelectOption value="all">All types</NativeSelectOption>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="rounded-lg border">
        <Table className="min-w-200">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.column.getCanSort() ? (
                      <Button
                        onClick={() => {
                          header.column.toggleSorting(
                            header.column.getIsSorted() !== "asc"
                          );
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon isSorted={header.column.getIsSorted()} />
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="flex min-h-48 flex-col items-center justify-center">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia>
                          <SearchX />
                        </EmptyMedia>
                        <EmptyTitle>No alerts found</EmptyTitle>
                        <EmptyDescription>
                          Try adjusting your search or filters.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {rows.length} of {mockAlerts.length} alerts
      </p>
    </div>
  );
};
