"use client";

import { BlockDndPlugin } from "@atlas/ui/components/block-dnd-plugin";

/**
 * Drag & drop for top-level blocks. The plugin is configured inside @atlas/ui
 * so its DndProvider and the @platejs/dnd hooks share one react-dnd instance.
 */
export const DndKit = [BlockDndPlugin];
