"use client";

import { cn } from "@atlas/ui/lib/utils";
import {
  TablePlugin,
  TableProvider,
  useTableCellElement,
  useTableCellElementResizable,
  useTableColSizes,
  useTableElement,
  useTableSelectionDom,
} from "@platejs/table/react";
import type { TTableCellElement, TTableElement } from "platejs";
import {
  type PlateElementProps,
  PlateElement,
  useEditorPlugin,
  withHOC,
} from "platejs/react";
import * as React from "react";

import { ResizeHandle } from "./resize-handle";

export const TableElement = withHOC(
  TableProvider,
  function TableElement({
    children,
    ...props
  }: PlateElementProps<TTableElement>) {
    const { marginLeft, props: tableProps } = useTableElement();
    const colSizes = useTableColSizes();
    const tableRef = React.useRef<HTMLTableElement>(null);

    useTableSelectionDom(tableRef);

    return (
      <PlateElement
        {...props}
        className="overflow-x-auto py-5"
        style={{ paddingLeft: marginLeft }}
      >
        <div className="group/table relative w-fit">
          <table
            ref={tableRef}
            className="mr-0 ml-px table h-px table-fixed border-collapse"
            {...tableProps}
          >
            {colSizes.length > 0 && (
              <colgroup>
                {colSizes.map((width, index) => (
                  <col key={index} style={{ width: width || undefined }} />
                ))}
              </colgroup>
            )}

            <tbody className="min-w-full">{children}</tbody>
          </table>
        </div>
      </PlateElement>
    );
  }
);

export function TableRowElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="tr" className="h-full">
      {props.children}
    </PlateElement>
  );
}

export function TableCellElement({
  isHeader,
  ...props
}: PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { api } = useEditorPlugin(TablePlugin);
  const { element } = props;
  const { borders, colIndex, colSpan, minHeight, rowIndex, selected, width } =
    useTableCellElement();
  const rowSpan = api.table.getRowSpan(element);

  return (
    <PlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      className={cn(
        "relative h-full overflow-visible border-none bg-background p-0",
        selected && "before:bg-muted/50",
        isHeader && "text-left font-normal *:m-0",
        "before:size-full before:absolute before:box-border before:select-none before:content-['']",
        borders &&
          cn(
            borders.bottom?.size && "before:border-b before:border-b-border",
            borders.right?.size && "before:border-r before:border-r-border",
            borders.left?.size && "before:border-l before:border-l-border",
            borders.top?.size && "before:border-t before:border-t-border"
          )
      )}
      attributes={{ ...props.attributes, colSpan, rowSpan }}
      style={{ maxWidth: width || 240, minWidth: width || 120 }}
    >
      <div
        className="relative z-20 box-border h-full px-4 py-2"
        style={{ minHeight }}
      >
        {props.children}
      </div>

      <TableCellElementResizable
        colIndex={colIndex}
        colSpan={colSpan}
        rowIndex={rowIndex}
      />
    </PlateElement>
  );
}

export function TableCellHeaderElement(
  props: PlateElementProps<TTableCellElement>
) {
  return <TableCellElement {...props} isHeader />;
}

function TableCellElementResizable({
  colIndex,
  colSpan,
  rowIndex,
}: {
  colIndex: number;
  colSpan: number;
  rowIndex: number;
}) {
  const { bottomProps, hiddenLeft, leftProps, rightProps } =
    useTableCellElementResizable({ colIndex, colSpan, rowIndex });

  // Overlay must stay pointer-events-none so clicks reach the editable cell
  // content; only the thin handle strips opt back into pointer events.
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 select-none"
      contentEditable={false}
    >
      {!hiddenLeft && (
        <ResizeHandle
          className="pointer-events-auto top-0 -left-1 h-full w-2 touch-none"
          {...leftProps}
        />
      )}

      <ResizeHandle
        className="pointer-events-auto -top-2 -right-1 h-[calc(100%+8px)] w-2 touch-none"
        {...rightProps}
      />
      <ResizeHandle
        className="pointer-events-auto -bottom-1 left-0 h-2 w-full touch-none"
        {...bottomProps}
      />
    </div>
  );
}
