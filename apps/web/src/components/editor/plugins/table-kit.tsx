"use client";

import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from "@atlas/ui/components/table-node";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import { KEYS } from "platejs";
import { createPlatePlugin } from "platejs/react";

/**
 * Slate's default delete cannot merge across a table boundary, so a table
 * gets stuck between blocks. Backspace at the start of the next block (or
 * Delete at the end of the previous one) removes the adjacent table instead.
 */
const TableBoundaryDeletePlugin = createPlatePlugin({
  handlers: {
    onKeyDown: ({ editor, event }) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const isBackspace = event.key === "Backspace";
      const isDelete = event.key === "Delete";

      if ((!isBackspace && !isDelete) || !editor.api.isCollapsed()) {
        return;
      }

      const blockEntry = editor.api.block({ highest: true });
      if (!blockEntry || !editor.selection) {
        return;
      }

      const [, blockPath] = blockEntry;
      const { anchor } = editor.selection;

      // Only act at the very edge of a top-level block.
      if (blockPath.length !== 1) {
        return;
      }
      if (isBackspace && !editor.api.isStart(anchor, blockPath)) {
        return;
      }
      if (isDelete && !editor.api.isEnd(anchor, blockPath)) {
        return;
      }

      // Sibling index of the current top-level block.
      const siblingIndex = blockPath[0] + (isBackspace ? -1 : 1);
      if (siblingIndex < 0) {
        return;
      }

      const sibling = editor.api.node([siblingIndex]);
      if (!sibling) {
        return;
      }

      const [node, path] = sibling;
      if (node.type !== editor.getType(KEYS.table)) {
        return;
      }

      event.preventDefault();
      editor.tf.removeNodes({ at: path });
    },
  },
  key: "table-boundary-delete",
});

export const TableKit = [
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
  TableBoundaryDeletePlugin,
];
