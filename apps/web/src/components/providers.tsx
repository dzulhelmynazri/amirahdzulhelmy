"use client";

import { Toaster } from "@atlas/ui/components/sonner";
import { TooltipProvider } from "@atlas/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <TooltipProvider>{children}</TooltipProvider>
        </NuqsAdapter>
        {/* <ReactQueryDevtools /> */}
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
