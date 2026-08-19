/* eslint-disable unicorn/prefer-export-from */

"use client";

import { Button } from "@atlas/ui/components/button";
import { cn } from "@atlas/ui/lib/utils";
import {
  MessageScroller as MessageScrollerPrimitive,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@shadcn/react/message-scroller";
import { ArrowDown } from "lucide-react";
import * as React from "react";

const MessageScrollerProvider = (
  props: React.ComponentProps<typeof MessageScrollerPrimitive.Provider>
) => <MessageScrollerPrimitive.Provider {...props} />;

const MessageScroller = ({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Root>) => (
  <MessageScrollerPrimitive.Root
    data-slot="message-scroller"
    className={cn(
      "group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden",
      className
    )}
    {...props}
  />
);

const MessageScrollerViewport = ({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Viewport>) => (
  <MessageScrollerPrimitive.Viewport
    data-slot="message-scroller-viewport"
    className={cn(
      "size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-thumb-transparent data-autoscrolling:scrollbar-track-transparent",
      className
    )}
    {...props}
  />
);

const MessageScrollerContent = ({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Content>) => (
  <MessageScrollerPrimitive.Content
    data-slot="message-scroller-content"
    className={cn("flex h-max min-h-full flex-col gap-8", className)}
    {...props}
  />
);

const MessageScrollerItem = ({
  className,
  scrollAnchor = false,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Item>) => (
  <MessageScrollerPrimitive.Item
    data-slot="message-scroller-item"
    scrollAnchor={scrollAnchor}
    className={cn(
      "min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]",
      className
    )}
    {...props}
  />
);

const MessageScrollerButton = ({
  direction = "end",
  className,
  children,
  render,
  variant = "secondary",
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Button> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) => (
  <MessageScrollerPrimitive.Button
    data-slot="message-scroller-button"
    data-direction={direction}
    data-variant={variant}
    data-size={size}
    direction={direction}
    className={cn(
      "absolute inset-s-1/2 -translate-x-1/2 border-border bg-background text-foreground transition-[translate,scale,opacity] duration-200 hover:bg-muted hover:text-foreground data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180",
      className
    )}
    render={render ?? <Button variant={variant} size={size} />}
    {...props}
  >
    {children ?? (
      <>
        <ArrowDown strokeWidth={2} />
        <span className="sr-only">
          {direction === "end" ? "Scroll to end" : "Scroll to start"}
        </span>
      </>
    )}
  </MessageScrollerPrimitive.Button>
);

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};
