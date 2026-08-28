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
 * Horizontal scroll rather than wrapping: a wrapped row grows the composer
 * area downward and pushes the conversation out of view, which is a heavy
 * price for something optional.
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
      className={cn(
        "scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1",
        className
      )}
      // A list, so a screen reader announces how many there are before
      // reading them out. Four unlabelled buttons in a row is a guessing game.
      role="group"
    >
      {items.map((item) => (
        <button
          className="shrink-0 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
