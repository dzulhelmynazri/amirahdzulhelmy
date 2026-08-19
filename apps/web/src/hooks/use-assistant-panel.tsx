"use client";

import { useSidebar } from "@atlas/ui/components/sidebar";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

/**
 * Controls the docked "Ask AI" assistant panel that sits to the right of the
 * dashboard content. The open state is lifted here so the site header trigger
 * and the panel itself can share it without prop drilling. Persisted to
 * localStorage so it survives navigation.
 */
interface AssistantPanelContextValue {
  isOpen: boolean;
  isFullWidth: boolean;
  open: (fullWidth?: boolean) => void;
  close: () => void;
  toggle: (fullWidth?: boolean) => void;
  getSidebarStateBeforeOpen: () => boolean;
  setSidebarStateBeforeOpen: (open: boolean) => void;
}

const STORAGE_KEY = "atlas:assistant-panel-open:v1";
const FULL_WIDTH_STORAGE_KEY = "atlas:assistant-panel-full:v1";
const SIDEBAR_SNAPSHOT_KEY = "atlas:assistant-sidebar-before-open:v1";

const readStoredBoolean = (key: string, fallback: boolean): boolean => {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
};

const persistPanelState = (nextOpen: boolean, nextFull: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, String(nextOpen));
    localStorage.setItem(FULL_WIDTH_STORAGE_KEY, String(nextFull));
  } catch {
    // storage unavailable (private mode/quota) — keep in-memory state only
  }
};

const persistSidebarSnapshot = (next: boolean): void => {
  try {
    localStorage.setItem(SIDEBAR_SNAPSHOT_KEY, String(next));
  } catch {
    // storage unavailable — keep in-memory state only
  }
};

const AssistantPanelContext = createContext<AssistantPanelContextValue | null>(
  null
);

export const AssistantPanelProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);

  const [sidebarStateBeforeOpenValue, setSidebarStateBeforeOpenValue] =
    useState(true);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsOpen(readStoredBoolean(STORAGE_KEY, false));
      setIsFullWidth(readStoredBoolean(FULL_WIDTH_STORAGE_KEY, false));
      setSidebarStateBeforeOpenValue(
        readStoredBoolean(SIDEBAR_SNAPSHOT_KEY, true)
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const open = useCallback((fullWidth = false) => {
    setIsOpen(true);
    setIsFullWidth(fullWidth);
    persistPanelState(true, fullWidth);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    persistPanelState(false, isFullWidth);
  }, [isFullWidth]);

  const toggle = useCallback(
    (fullWidth = false) => {
      setIsOpen((prev) => {
        const next = !prev;
        if (next) {
          setIsFullWidth(fullWidth);
        }
        persistPanelState(next, next ? fullWidth : isFullWidth);
        return next;
      });
    },
    [isFullWidth]
  );

  const getSidebarStateBeforeOpen = useCallback(
    () => sidebarStateBeforeOpenValue,
    [sidebarStateBeforeOpenValue]
  );

  const setSidebarStateBeforeOpen = useCallback((next: boolean) => {
    setSidebarStateBeforeOpenValue(next);
    persistSidebarSnapshot(next);
  }, []);

  const value = useMemo<AssistantPanelContextValue>(
    () => ({
      close,
      getSidebarStateBeforeOpen,
      isFullWidth,
      isOpen,
      open,
      setSidebarStateBeforeOpen,
      toggle,
    }),
    [
      close,
      getSidebarStateBeforeOpen,
      isFullWidth,
      isOpen,
      open,
      setSidebarStateBeforeOpen,
      toggle,
    ]
  );

  return (
    <AssistantPanelContext value={value}>{children}</AssistantPanelContext>
  );
};

export const useAssistantPanel = (): AssistantPanelContextValue => {
  const context = use(AssistantPanelContext);
  if (!context) {
    throw new Error(
      "useAssistantPanel must be used within an AssistantPanelProvider."
    );
  }
  return context;
};

/**
 * Coordinates the assistant panel with the app sidebar. Opening the assistant
 * collapses the sidebar to make room; closing it restores whatever state the
 * sidebar had before opening (rather than always forcing it open). On mobile
 * the sidebar is an overlay, so we leave it untouched.
 */
export const useAssistantSidebarSync = () => {
  const {
    isOpen,
    isFullWidth,
    open,
    close,
    getSidebarStateBeforeOpen,
    setSidebarStateBeforeOpen,
  } = useAssistantPanel();
  const { open: sidebarOpen, setOpen: setSidebarOpen, isMobile } = useSidebar();

  const openAssistant = useCallback(
    (fullWidth = false) => {
      if (isOpen && isFullWidth === fullWidth) {
        return;
      }
      if (!isMobile) {
        setSidebarStateBeforeOpen(sidebarOpen);
        setSidebarOpen(false);
      }
      open(fullWidth);
    },
    [
      isOpen,
      isFullWidth,
      isMobile,
      sidebarOpen,
      setSidebarStateBeforeOpen,
      setSidebarOpen,
      open,
    ]
  );

  const closeAssistant = useCallback(() => {
    if (!isOpen) {
      return;
    }
    if (!isMobile) {
      setSidebarOpen(getSidebarStateBeforeOpen());
    }
    close();
  }, [isOpen, isMobile, setSidebarOpen, getSidebarStateBeforeOpen, close]);

  const toggleAssistant = useCallback(
    (fullWidth = false) => {
      if (isOpen) {
        if (isFullWidth === fullWidth) {
          closeAssistant();
        } else {
          openAssistant(fullWidth);
        }
      } else {
        openAssistant(fullWidth);
      }
    },
    [isOpen, isFullWidth, closeAssistant, openAssistant]
  );

  return {
    closeAssistant,
    isFullWidth,
    isOpen,
    openAssistant,
    toggleAssistant,
  };
};
