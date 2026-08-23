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
import { Skeleton } from "@atlas/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@atlas/ui/components/table";
import { formatCurrency } from "@atlas/utils/currency";
import { formatDate } from "@atlas/utils/date";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import * as countryFlags from "country-flag-icons/react/3x2";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Search,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CopyPnrButton } from "@/components/bookings/copy-pnr";
import { RowActions } from "@/components/bookings/row-actions";
import {
  getPassengers,
  getSegments,
  statusLabels,
  statusRank,
  statusVariants,
} from "@/types/bookings";
import type { Booking, BookingStatus } from "@/types/bookings";

type FlagComponent = typeof countryFlags.JP;

const countryFlagRegistry: Record<string, FlagComponent> = { ...countryFlags };

const AirportFlag = ({ countryCode }: { countryCode: string }) => {
  const Flag = countryFlagRegistry[countryCode];
  if (!Flag) {
    return null;
  }
  return <Flag className="h-3 w-4.5 rounded-[2px] ring-1 ring-foreground/10" />;
};

const SKELETON_ROW_COUNT = 6;

const skeletonCellWidths = [
  "w-24",
  "w-36",
  "w-20",
  "w-24",
  "w-16",
  "w-14",
  "w-20",
  "w-20",
  "w-28",
];

const features = tableFeatures({
  rowSortingFeature,
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
  },
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, Booking>();

const columns = columnHelper.columns([
  columnHelper.accessor("orderNo", {
    cell: (info) => (
      <Link
        className="font-mono text-sm font-medium underline underline-offset-4"
        href={`/bookings?booking=${info.getValue()}`}
      >
        {info.getValue()}
      </Link>
    ),
    header: "Order",
  }),
  columnHelper.display({
    cell: (info) => {
      const segments = getSegments(info.row.original.payload);
      const [first] = segments;
      if (!first) {
        return <span className="text-muted-foreground">—</span>;
      }
      const last = segments.at(-1) ?? first;
      const { airline } = first;
      const detail =
        segments.length > 1
          ? `${airline} · ${segments.length} segments`
          : `${airline} · ${first.flightNumber}`;
      return (
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <AirportFlag countryCode={first.origin.country} />
            {first.origin.code}
            <ArrowRight className="size-3 text-muted-foreground" />
            {last.destination.code}
            <AirportFlag countryCode={last.destination.country} />
          </span>
          <span className="text-muted-foreground">{detail}</span>
        </div>
      );
    },
    enableSorting: false,
    header: "Route",
    id: "route",
  }),
  columnHelper.accessor(
    (row) => getSegments(row.payload).at(0)?.departure ?? "",
    {
      cell: (info) => (
        <span>{info.getValue() ? formatDate(info.getValue()) : "—"}</span>
      ),
      header: "Departure",
      id: "departure",
    }
  ),
  columnHelper.accessor((row) => getPassengers(row.payload).length, {
    cell: (info) => {
      const passengers = getPassengers(info.row.original.payload);
      if (passengers.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      const names = passengers.map((passenger) => passenger.name).join(", ");
      return (
        <HoverCard>
          <HoverCardTrigger className="block max-w-40 truncate">
            {info.getValue()}{" "}
            {info.getValue() === 1 ? "passenger" : "passengers"}
          </HoverCardTrigger>
          <HoverCardContent>
            <p className="text-muted-foreground">{names}</p>
          </HoverCardContent>
        </HoverCard>
      );
    },
    header: "Passengers",
    id: "passengers",
  }),
  columnHelper.accessor("status", {
    cell: (info) => {
      const status = info.getValue() as BookingStatus;
      return (
        <Badge variant={statusVariants[status] ?? "outline"}>
          {statusLabels[status] ?? info.getValue()}
        </Badge>
      );
    },
    header: "Status",
    sortFn: (rowA, rowB) =>
      (statusRank[rowA.original.status as BookingStatus] ?? -1) -
      (statusRank[rowB.original.status as BookingStatus] ?? -1),
  }),
  columnHelper.accessor("pnr", {
    cell: (info) => {
      const pnr = info.getValue();
      if (!pnr) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex items-center gap-0.5">
          <span className="font-mono text-sm">{pnr}</span>
          <CopyPnrButton pnr={pnr} />
        </div>
      );
    },
    enableSorting: false,
    header: "PNR",
  }),
  columnHelper.accessor((row) => Number(row.totalAmount ?? 0), {
    cell: (info) => (
      <span className="font-medium">
        {formatCurrency(info.getValue(), info.row.original.currency)}
      </span>
    ),
    header: "Total",
    id: "total",
  }),
  columnHelper.accessor("createdAt", {
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
    header: "Booked",
    sortFn: (rowA, rowB) =>
      new Date(rowA.original.createdAt).getTime() -
      new Date(rowB.original.createdAt).getTime(),
  }),
  columnHelper.display({
    cell: (info) => <RowActions booking={info.row.original} />,
    header: () => <div className="text-right">Actions</div>,
    id: "actions",
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

const matchesQuery = (booking: Booking, query: string): boolean => {
  const haystack = [
    booking.orderNo,
    booking.pnr ?? "",
    ...getPassengers(booking.payload).map((passenger) => passenger.name),
    ...getSegments(booking.payload).flatMap((segment) => [
      segment.airline,
      segment.flightNumber,
      segment.origin.city,
      segment.origin.code,
      segment.destination.city,
      segment.destination.code,
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
};

export const DataTable = ({
  bookings,
  loading = false,
}: {
  bookings: Booking[];
  loading?: boolean;
}) => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">(
    "all"
  );
  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: "createdAt" },
  ]);

  const filteredBookings = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;
      return matchesStatus && (query === "" || matchesQuery(booking, query));
    });
  }, [bookings, globalFilter, statusFilter]);

  const table = useTable({
    columns,
    data: filteredBookings,
    features,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const { rows } = table.getRowModel();

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {skeletonCellWidths.map((width, cellIndex) => (
            <TableCell key={`skeleton-cell-${cellIndex}`}>
              <Skeleton className={`h-4 ${width}`} />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (rows.length === 0) {
      const isEmpty = bookings.length === 0;
      return (
        <TableRow>
          <TableCell colSpan={columns.length}>
            <div className="flex min-h-48 flex-col items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    {isEmpty ? <CalendarDays /> : <SearchX />}
                  </EmptyMedia>
                  <EmptyTitle>
                    {isEmpty ? "No bookings yet" : "No bookings found"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {isEmpty
                      ? "Book a flight with the booking agent and it will appear here."
                      : "Try adjusting your search or filters."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => (
      <TableRow key={row.id}>
        {row.getAllCells().map((cell) => (
          <TableCell key={cell.id}>
            <table.FlexRender cell={cell} />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search bookings"
            onChange={(event) => {
              const { value } = event.target;
              setGlobalFilter(value);
            }}
            placeholder="Search order, PNR, route or passenger"
            value={globalFilter}
          />
        </InputGroup>
        <NativeSelect
          aria-label="Filter by booking status"
          onChange={(event) => {
            const { value } = event.target;
            setStatusFilter(value as BookingStatus | "all");
          }}
          value={statusFilter}
        >
          <NativeSelectOption value="all">All statuses</NativeSelectOption>
          {Object.entries(statusLabels).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="rounded-lg border">
        <Table className="min-w-216">
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
          <TableBody>{renderBody()}</TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {loading
          ? "Loading bookings..."
          : `${rows.length} of ${bookings.length} bookings`}
      </p>
    </div>
  );
};
