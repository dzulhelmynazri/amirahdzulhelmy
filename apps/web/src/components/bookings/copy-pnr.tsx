"use client";

import { Button } from "@atlas/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@atlas/ui/components/tooltip";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const COPIED_RESET_MS = 1500;

/** Icon button that copies a PNR to the clipboard. */
export const CopyPnrButton = ({ pnr }: { pnr: string }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_RESET_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pnr);
      setCopied(true);
      toast.success("PNR copied");
    } catch {
      toast.error("Could not copy PNR");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={copied ? "PNR copied" : "Copy PNR"}
            onClick={() => {
              void handleCopy();
            }}
            size="icon-xs"
            variant="ghost"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        }
      />
      <TooltipContent>{copied ? "Copied" : "Copy PNR"}</TooltipContent>
    </Tooltip>
  );
};
