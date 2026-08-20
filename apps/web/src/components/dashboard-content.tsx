"use client";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";

export const DashboardContent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isOpen, isFullWidth } = useAgentSidebarSync();

  if (isOpen && isFullWidth) {
    return null;
  }

  return children;
};
