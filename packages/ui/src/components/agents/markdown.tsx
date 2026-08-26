"use client";

import { cn } from "@atlas/ui/lib/utils";
import { Streamdown } from "streamdown";

/**
 * Renders an agent's reply as Markdown.
 *
 * `StreamingResponse` deliberately does not parse Markdown — it takes "plain
 * text or the output of a Markdown renderer". Passing the raw string put
 * literal `**` on screen and collapsed every bulleted list of flights into one
 * unreadable paragraph.
 *
 * `mode="streaming"` matters as much as the parsing does. Text arrives a token
 * at a time, so a half-written `**Thursday` would otherwise flicker between
 * bold and literal asterisks on every frame; Streamdown holds the incomplete
 * span until it closes.
 *
 * Prose styles are set here rather than inherited, because the surrounding
 * chat bubble sets none: without them headings, lists and tables all render at
 * body size with no spacing, which is only marginally better than the raw
 * asterisks.
 */
export const Markdown = ({
  children,
  className,
  streaming = false,
}: {
  children: string;
  className?: string;
  streaming?: boolean;
}) => (
  <Streamdown
    className={cn(
      "space-y-3 text-sm leading-relaxed",
      "[&_p]:leading-relaxed",
      "[&_strong]:font-semibold [&_strong]:text-foreground",
      "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
      "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
      "[&_li]:pl-0.5 [&_li]:marker:text-muted-foreground",
      "[&_h1]:font-semibold [&_h1]:text-base [&_h2]:font-semibold [&_h2]:text-base",
      "[&_h3]:font-medium [&_h3]:text-sm",
      "[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2",
      "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
      "[&_hr]:border-border",
      "[&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
      // Tables carry fare comparisons, so they scroll rather than squeeze.
      "[&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-xs",
      "[&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium",
      "[&_td]:px-2 [&_td]:py-1",
      className
    )}
    mode={streaming ? "streaming" : "static"}
    parseIncompleteMarkdown={streaming}
  >
    {children}
  </Streamdown>
);
