"use client";

import { BlockDraggable } from "@atlas/ui/components/block-draggable";
import { DndPlugin } from "@platejs/dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

/**
 * Pre-configured drag & drop plugin. Lives in the UI package so the
 * DndProvider and the react-dnd hooks inside @platejs/dnd resolve the same
 * react-dnd instance — mounting the provider from an app with its own copy
 * leaves the hooks without a drag drop context.
 *
 * - `aboveNodes` wraps every rendered block with the lean BlockDraggable
 *   (grip handle + drop line).
 * - `aboveSlate` mounts the react-dnd provider the drag hooks require.
 */
export const BlockDndPlugin = DndPlugin.configure({
  render: {
    aboveNodes: BlockDraggable,
    aboveSlate: ({ children }) => (
      <DndProvider backend={HTML5Backend}>{children}</DndProvider>
    ),
  },
});
