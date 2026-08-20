"use client";

import { TrailingBlockPlugin } from "platejs";
import type { Value } from "platejs";
import { useEditorRef } from "platejs/react";
import type { TPlateEditor } from "platejs/react";

import { AutoformatKit } from "@/components/editor/plugins/autoformat-kit";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { BlockPlaceholderKit } from "@/components/editor/plugins/block-placeholder-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";

/**
 * Lean plugin set for trip documents. Deliberately omits the heavy kits
 * (AI, copilot, dnd, emoji, docx, tables, math, excalidraw, media uploads)
 * so they never enter the bundle. The atlas-agent sidebar is the AI source;
 * it upserts content via a server action rather than Plate's in-editor AI.
 */
export const TripsEditorKit = [
  // Blocks: headings, paragraph, blockquote, horizontal rule
  ...BasicBlocksKit,
  // Links — for Google Maps and external references
  ...LinkKit,
  // Marks: bold, italic, underline, strikethrough, code, highlight
  ...BasicMarksKit,
  // Lists — itinerary line items
  ...ListKit,

  // Editing helpers
  ...AutoformatKit,
  ...BlockPlaceholderKit,
  TrailingBlockPlugin,
];

export type TripsEditor = TPlateEditor<Value, (typeof TripsEditorKit)[number]>;

export const useTripsEditor = () => useEditorRef<TripsEditor>();
