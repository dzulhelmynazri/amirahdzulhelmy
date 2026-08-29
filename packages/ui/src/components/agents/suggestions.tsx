"use client";

import { cn } from "@atlas/ui/lib/utils";

/**
 * A row of one-tap next moves.
 *
 * Deliberately lighter than the approval card. A card is for a decision that
 * blocks — it takes the width, states the question and waits. These are things
 * the traveller may want next and may equally ignore, so they sit quietly by
 * the composer and take a single tap when one of them is right.
 *
 * Wrapped, not scrolled. A single scrolling row was the first attempt and it
 * was wrong: measured in the docked panel, two pills came to 644px inside a
 * 517px box, so one was already cut off with no scrollbar to say so. An
 * invisible suggestion is worse than a missing one — the row looks complete
 * and quietly is not.
 *
 * Wrapping costs a line of height. That is cheaper than hiding a third of
 * what was offered.
 */
export interface SuggestionItem {
  id: string;
  label: string;
}

export const Suggestions = ({
  className,
  items,
  onSelect,
}: {
  className?: string;
  items: readonly SuggestionItem[];
  onSelect: (item: SuggestionItem) => void;
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Suggested next steps"
      className={cn("flex flex-wrap gap-2", className)}
      // A list, so a screen reader announces how many there are before
      // reading them out. Four unlabelled buttons in a row is a guessing game.
      role="group"
    >
      {items.map((item) => (
        <button
          className="rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          key={item.id}
          onClick={() => onSelect(item)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
