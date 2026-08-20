"use client";

import { BlockList } from "@atlas/ui/components/block-list";
import {
  BulletedListRules,
  isOrderedList,
  OrderedListRules,
  TaskListRules,
} from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { KEYS } from "platejs";

import { IndentKit } from "@/components/editor/plugins/indent-kit";

export const ListKit = [
  ...IndentKit,
  ListPlugin.configure({
    inject: {
      nodeProps: {
        nodeKey: KEYS.listType,
        query: ({ nodeProps }) => {
          const { element } = nodeProps;

          return !!element?.listStyleType && !isOrderedList(element);
        },
        transformProps: ({ props }) => ({
          ...props,
          role: "listitem",
          style: {
            ...props.style,
            display: "list-item",
          },
        }),
      },
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
        KEYS.img,
      ],
    },
    inputRules: [
      BulletedListRules.markdown({ variant: "-" }),
      BulletedListRules.markdown({ variant: "*" }),
      OrderedListRules.markdown({ variant: "." }),
      OrderedListRules.markdown({ variant: ")" }),
      TaskListRules.markdown({ checked: false }),
      TaskListRules.markdown({ checked: true }),
    ],
    render: {
      belowNodes: BlockList,
    },
  }),
];
