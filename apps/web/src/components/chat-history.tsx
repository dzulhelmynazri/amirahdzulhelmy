"use client";

import { Button } from "@atlas/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@atlas/ui/components/dropdown-menu";
import { History, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { ConversationSummary } from "@/app/actions/conversations";
import { listConversations } from "@/app/actions/conversations";

/** `Aug 27` for this year, `Aug 27, 2025` for anything older. */
const formatWhen = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

/**
 * Past chats, loaded when the menu opens.
 *
 * Fetched on open rather than on mount: the panel is on every page, and a
 * history nobody looked at is not worth a query on every navigation.
 */
export const ChatHistory = ({
  onDelete,
  onOpen,
}: {
  /**
   * Goes through the chat session rather than straight to the server action.
   * Deleting the conversation that is currently open has to clear the panel
   * too, and this component has no idea which one that is.
   */
  onDelete: (sessionId: string) => Promise<void>;
  onOpen: (sessionId: string) => Promise<void>;
}) => {
  const [rows, setRows] = useState<ConversationSummary[] | null>(null);
  const [, startLoading] = useTransition();
  const [, startRemoving] = useTransition();

  const load = () => {
    setRows(null);
    startLoading(async () => {
      setRows(await listConversations());
    });
  };

  const remove = (sessionId: string) => {
    setRows((current) =>
      (current ?? []).filter((row) => row.sessionId !== sessionId)
    );
    startRemoving(async () => {
      await onDelete(sessionId);
    });
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          load();
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Past conversations"
            size="icon-sm"
            variant="ghost"
          >
            <History />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        {/* The label is a group label: outside a group it throws. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Past conversations</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {rows === null ? (
          <p className="px-2 py-3 text-muted-foreground text-sm">Loading…</p>
        ) : null}

        {rows?.length === 0 ? (
          <p className="px-2 py-3 text-muted-foreground text-sm">
            Nothing yet. Chats appear here once you have sent a message.
          </p>
        ) : null}

        {rows?.map((row) => (
          <DropdownMenuItem
            className="flex items-start gap-2"
            key={row.sessionId}
            onClick={async () => {
              await onOpen(row.sessionId);
            }}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{row.title}</span>
              <span className="text-muted-foreground text-xs">
                {formatWhen(row.lastMessageAt)}
              </span>
            </span>
            <Button
              aria-label={`Delete ${row.title}`}
              // Stops the row's own click from opening the chat being deleted.
              onClick={(event) => {
                event.stopPropagation();
                remove(row.sessionId);
              }}
              size="icon-sm"
              variant="ghost"
            >
              <Trash2 />
            </Button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
