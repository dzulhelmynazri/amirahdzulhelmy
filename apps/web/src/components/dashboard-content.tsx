"use client";

import { useAssistantSidebarSync } from "@/hooks/use-assistant-panel";

export const DashboardContent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isOpen, isFullWidth } = useAssistantSidebarSync();

  if (isOpen && isFullWidth) {
    return null;
  }

  return children;
};
