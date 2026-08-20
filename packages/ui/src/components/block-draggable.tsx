"use client";

import { Button } from "@atlas/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@atlas/ui/components/tooltip";
import { cn } from "@atlas/ui/lib/utils";
import { focusBlockStartById, useDraggable, useDropLine } from "@platejs/dnd";
import { GripVertical } from "lucide-react";
import {
  MemoizedChildren,
  type PlateElementProps,
  type RenderNodeWrapper,
} from "platejs/react";
import * as React from "react";

/**
 * Lean alternative to the Plate registry block-draggable: wraps top-level
 * blocks with a hover drag handle and drop line. Omits block-selection and
 * multi-block drag previews to keep the bundle small.
 */
export const BlockDraggable: RenderNodeWrapper = ({
  editor,
  element,
  path,
}) => {
  // Only top-level blocks drag. Nested content (list items, table rows and
  // cells) stays put so inner editing is unaffected.
  if (editor.dom.readOnly || path.length !== 1) return;

  // NodeIdPlugin (core) assigns ids; without one there is nothing to move.
  if (!element.id) return;

  return (props) => <Draggable {...props} />;
};

function Draggable({ children, editor, element }: PlateElementProps) {
  const { isAboutToDrag, isDragging, nodeRef, previewRef, handleRef } =
    useDraggable({
      element,
      onDropHandler: (_, { dragItem }) => {
        const { id } = dragItem as { id: string[] | string };
        focusBlockStartById(editor, Array.isArray(id) ? id[0]! : id);
      },
    });

  // The preview div must stay mounted for react-dnd's preview connector. It
  // is filled with a DOM clone of the block on handle mousedown and cleared
  // once the drag ends.
  const resetPreview = React.useCallback(() => {
    const preview = previewRef.current;

    if (!preview) return;

    preview.replaceChildren();
    preview.classList.add("hidden");
  }, [previewRef]);

  const populatePreview = React.useCallback(() => {
    const preview = previewRef.current;
    const domNode = editor.api.toDOMNode(element);

    if (!preview || !domNode) return;

    const clone = domNode.cloneNode(true) as HTMLElement;
    stripSlateAttributes(clone);

    const wrapper = document.createElement("div");
    wrapper.style.display = "flow-root";
    wrapper.append(clone);

    preview.replaceChildren(wrapper);
    preview.classList.remove("hidden");
    preview.classList.add("opacity-0");
  }, [editor, element, previewRef]);

  React.useEffect(() => {
    if (isDragging) return;

    resetPreview();
  }, [isDragging, resetPreview]);

  // The clone stays invisible until the browser actually starts the drag so
  // a plain click on the handle never flashes a duplicate block.
  React.useEffect(() => {
    if (!isAboutToDrag) return;

    previewRef.current?.classList.remove("opacity-0");
  }, [isAboutToDrag, previewRef]);

  return (
    <div className={cn("group relative", isDragging && "opacity-50")}>
      <div
        className="absolute top-0 flex -translate-x-full cursor-grab items-center opacity-0 transition-opacity group-hover:opacity-100"
        contentEditable={false}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                ref={handleRef}
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground"
                data-plate-prevent-deselect
                onMouseDown={populatePreview}
                onMouseUp={resetPreview}
              >
                <GripVertical />
              </Button>
            }
          />
          <TooltipContent>Drag to move</TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={previewRef}
        className="absolute top-0 left-0 hidden w-full"
        contentEditable={false}
      />

      <div ref={nodeRef} className="flow-root">
        <MemoizedChildren>{children}</MemoizedChildren>
        <DropLine />
      </div>
    </div>
  );
}

function DropLine() {
  const { dropLine } = useDropLine();

  if (!dropLine) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 h-0.5 bg-brand/50 transition-opacity",
        dropLine === "top" && "-top-px",
        dropLine === "bottom" && "-bottom-px"
      )}
      contentEditable={false}
    />
  );
}

/**
 * Remove slate data attributes so the cloned preview is not mistaken for a
 * live editor node.
 */
const stripSlateAttributes = (node: HTMLElement) => {
  for (const attr of Array.from(node.attributes)) {
    if (
      attr.name.startsWith("data-slate") ||
      attr.name.startsWith("data-block-id")
    ) {
      node.removeAttribute(attr.name);
    }
  }

  for (const child of Array.from(node.children)) {
    stripSlateAttributes(child as HTMLElement);
  }
};
