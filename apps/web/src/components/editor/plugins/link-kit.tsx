"use client";

import { LinkElement } from "@atlas/ui/components/link-node";
import { LinkFloatingToolbar } from "@atlas/ui/components/link-toolbar";
import { LinkRules } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";

export const LinkKit = [
  LinkPlugin.configure({
    inputRules: [
      LinkRules.markdown(),
      LinkRules.autolink({ variant: "paste" }),
      LinkRules.autolink({ variant: "space" }),
      LinkRules.autolink({ variant: "break" }),
    ],
    render: {
      afterEditable: () => <LinkFloatingToolbar />,
      node: LinkElement,
    },
  }),
];
