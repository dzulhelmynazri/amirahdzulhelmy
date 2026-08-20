"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@atlas/ui/components/dropdown-menu";
import {
  RedoToolbarButton,
  UndoToolbarButton,
} from "@atlas/ui/components/history-toolbar-button";
import { LinkToolbarButton } from "@atlas/ui/components/link-toolbar-button";
import {
  BulletedListToolbarButton,
  NumberedListToolbarButton,
  TodoListToolbarButton,
} from "@atlas/ui/components/list-toolbar-button";
import { MarkToolbarButton } from "@atlas/ui/components/mark-toolbar-button";
import { ToolbarButton, ToolbarGroup } from "@atlas/ui/components/toolbar";
import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ItalicIcon,
  PilcrowIcon,
  QuoteIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react";
import type { TElement } from "platejs";
import { KEYS } from "platejs";
import { useEditorRef, useSelectionFragmentProp } from "platejs/react";
import * as React from "react";

const turnIntoItems = [
  { icon: <PilcrowIcon className="size-4" />, label: "Text", value: KEYS.p },
  {
    icon: <Heading1Icon className="size-4" />,
    label: "Heading 1",
    value: "h1",
  },
  {
    icon: <Heading2Icon className="size-4" />,
    label: "Heading 2",
    value: "h2",
  },
  {
    icon: <Heading3Icon className="size-4" />,
    label: "Heading 3",
    value: "h3",
  },
  {
    icon: <Heading4Icon className="size-4" />,
    label: "Heading 4",
    value: "h4",
  },
  {
    icon: <Heading5Icon className="size-4" />,
    label: "Heading 5",
    value: "h5",
  },
  {
    icon: <Heading6Icon className="size-4" />,
    label: "Heading 6",
    value: "h6",
  },
  {
    icon: <QuoteIcon className="size-4" />,
    label: "Quote",
    value: KEYS.blockquote,
  },
] as const;

const TurnIntoDropdown = () => {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const value = useSelectionFragmentProp({
    defaultValue: KEYS.p,
    getProp: (node) => (node as TElement).type,
  });

  const selectedItem =
    turnIntoItems.find((item) => item.value === value) ?? turnIntoItems[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton
            className="min-w-[120px]"
            pressed={open}
            tooltip="Turn into"
            isDropdown
          />
        }
      >
        {selectedItem.label}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="ignore-click-outside/toolbar min-w-0"
        align="start"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(type) => {
            editor.tf.setNodes<TElement>({ type });
            editor.tf.focus();
          }}
        >
          {turnIntoItems.map(({ icon, label, value: itemValue }) => (
            <DropdownMenuRadioItem
              key={itemValue}
              className="min-w-[180px] pl-2"
              value={itemValue}
            >
              {icon}
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const TripsToolbarButtons = () => (
  <div className="flex w-full">
    <ToolbarGroup>
      <UndoToolbarButton />
      <RedoToolbarButton />
    </ToolbarGroup>

    <ToolbarGroup>
      <TurnIntoDropdown />
    </ToolbarGroup>

    <ToolbarGroup>
      <BulletedListToolbarButton />
      <NumberedListToolbarButton />
      <TodoListToolbarButton />
    </ToolbarGroup>

    <ToolbarGroup>
      <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
        <BoldIcon />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
        <ItalicIcon />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType={KEYS.underline} tooltip="Underline (⌘+U)">
        <UnderlineIcon />
      </MarkToolbarButton>
      <MarkToolbarButton
        nodeType={KEYS.strikethrough}
        tooltip="Strikethrough (⌘+⇧+M)"
      >
        <StrikethroughIcon />
      </MarkToolbarButton>
    </ToolbarGroup>

    <ToolbarGroup>
      <LinkToolbarButton />
    </ToolbarGroup>
  </div>
);
