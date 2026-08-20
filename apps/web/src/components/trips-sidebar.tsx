"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@atlas/ui/components/alert-dialog";
import { Button } from "@atlas/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@atlas/ui/components/dropdown-menu";
import { Input } from "@atlas/ui/components/input";
import { Skeleton } from "@atlas/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/utils/trpc";

const TripRenameInput = memo(
  ({
    tripId,
    initialTitle,
    onDone,
  }: {
    tripId: string;
    initialTitle: string;
    onDone: () => void;
  }) => {
    const queryClient = useQueryClient();
    const [value, setValue] = useState(initialTitle);
    const ref = useRef<HTMLInputElement>(null);

    const renameTrip = useMutation(
      trpc.trips.update.mutationOptions({
        onError: () => {
          queryClient.invalidateQueries({
            queryKey: trpc.trips.list.queryKey(),
          });
        },
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: trpc.trips.list.queryKey(),
          });
        },
      })
    );

    useEffect(() => {
      ref.current?.focus();
      ref.current?.select();
    }, []);

    const commit = () => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== initialTitle) {
        // Optimistic update - reflect new title instantly in the sidebar
        queryClient.setQueryData(trpc.trips.list.queryKey(), (oldData) => {
          if (!oldData) {
            return oldData;
          }
          return oldData.map((t) =>
            t.id === tripId ? { ...t, title: trimmed } : t
          );
        });
        renameTrip.mutate({ id: tripId, title: trimmed });
      }
      onDone();
    };

    return (
      <Input
        className="h-8 text-sm"
        onBlur={commit}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
          } else if (e.key === "Escape") {
            onDone();
          }
        }}
        ref={ref}
        value={value}
      />
    );
  }
);
TripRenameInput.displayName = "TripRenameInput";

export const TripsSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const trips = useQuery(trpc.trips.list.queryOptions());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const tripList = trips.data ?? [];

  const createTrip = useMutation(
    trpc.trips.create.mutationOptions({
      onSuccess: (trip) => {
        queryClient.invalidateQueries({
          queryKey: trpc.trips.list.queryKey(),
        });
        router.push(`/trips/${trip.id}`);
      },
    })
  );

  const deleteTrip = useMutation(
    trpc.trips.delete.mutationOptions({
      onSuccess: (deleted) => {
        queryClient.invalidateQueries({
          queryKey: trpc.trips.list.queryKey(),
        });
        if (pathname === `/trips/${deleted.id}`) {
          router.push("/trips");
        }
        setTripToDelete(null);
      },
    })
  );

  const handleEditDone = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r">
      <div className="border-b p-3">
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => createTrip.mutate({ title: "Untitled trip" })}
          disabled={createTrip.isPending}
        >
          <Plus data-icon="inline-start" />
          New trip
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          All trips
        </p>
        {(() => {
          if (trips.isLoading) {
            return (
              <nav className="flex flex-col gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    className="flex flex-col gap-1 rounded-md px-2 py-1.5 pr-7"
                    key={`skeleton-${i}`}
                  >
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                ))}
              </nav>
            );
          }

          if (tripList.length === 0) {
            return (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No trips yet
              </div>
            );
          }

          return (
            <nav className="flex flex-col gap-0.5">
              {tripList.map((trip) => {
                const href = `/trips/${trip.id}`;
                const isActive = pathname === href;
                const isEditing = editingId === trip.id;

                return (
                  <div className="group relative" key={trip.id}>
                    {isEditing ? (
                      <TripRenameInput
                        tripId={trip.id}
                        initialTitle={trip.title}
                        onDone={handleEditDone}
                      />
                    ) : (
                      <Link
                        className={`flex flex-col gap-0.5 rounded-md px-2 py-1.5 pr-7 text-sm transition-colors hover:bg-accent ${
                          isActive ? "bg-accent font-medium" : ""
                        }`}
                        href={href}
                      >
                        <span className="truncate">{trip.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("en", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(trip.createdAt))}
                        </span>
                      </Link>
                    )}
                    {!isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Trip options"
                              className="absolute right-1 top-1 flex size-6 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                              type="button"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingId(trip.id)}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              setTripToDelete({
                                id: trip.id,
                                title: trip.title,
                              })
                            }
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </nav>
          );
        })()}
      </div>

      <AlertDialog
        open={tripToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTripToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {tripToDelete?.title}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteTrip.isPending}
              onClick={() =>
                tripToDelete && deleteTrip.mutate({ id: tripToDelete.id })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
};
