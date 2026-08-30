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
 * Controls the docked "Ask AI" agent panel that sits to the right of the
 * dashboard content. The open state is lifted here so the site header trigger
 * and the panel itself can share it without prop drilling. Persisted to
 * localStorage so it survives navigation.
 */
interface AgentPanelContextValue {
  /**
   * Text staged into the composer by another surface. The fares page uses it
   * to hand a chosen flight to the agent with every id and date already in the
   * message, so the traveller does not retype what they just picked.
   */
  draft: string;
  setDraft: (text: string) => void;
  /**
   * Machine detail the agent needs and the traveller should never read — the
   * opaque `routingIdentifier` a chosen fare carries. It rode in the draft
   * once, which put an 80-character base64 token in the composer and then in
   * the message bubble, and turned "press send" into "decipher this first".
   * Appended to the text on submit instead, so the agent still gets it.
   */
  draftContext: string;
  setDraftContext: (text: string) => void;
  isOpen: boolean;
  isFullWidth: boolean;
  mounted: boolean;
  open: (fullWidth?: boolean) => void;
  close: () => void;
  toggle: (fullWidth?: boolean) => void;
  getSidebarStateBeforeOpen: () => boolean;
  setSidebarStateBeforeOpen: (open: boolean) => void;
}

const STORAGE_KEY = "atlas:agent-panel-open:v1";
const FULL_WIDTH_STORAGE_KEY = "atlas:agent-panel-full:v1";
const SIDEBAR_SNAPSHOT_KEY = "atlas:agent-sidebar-before-open:v1";

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

const AgentPanelContext = createContext<AgentPanelContextValue | null>(null);

export const AgentPanelProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftContext, setDraftContext] = useState("");
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [sidebarStateBeforeOpenValue, setSidebarStateBeforeOpenValue] =
    useState(true);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsOpen(readStoredBoolean(STORAGE_KEY, false));
      setIsFullWidth(readStoredBoolean(FULL_WIDTH_STORAGE_KEY, false));
      setSidebarStateBeforeOpenValue(
        readStoredBoolean(SIDEBAR_SNAPSHOT_KEY, true)
      );
      setMounted(true);
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

  const value = useMemo<AgentPanelContextValue>(
    () => ({
      close,
      draft,
      draftContext,
      getSidebarStateBeforeOpen,
      isFullWidth,
      isOpen,
      mounted,
      open,
      setDraft,
      setDraftContext,
      setSidebarStateBeforeOpen,
      toggle,
    }),
    [
      close,
      draft,
      draftContext,
      getSidebarStateBeforeOpen,
      isFullWidth,
      isOpen,
      mounted,
      open,
      setSidebarStateBeforeOpen,
      toggle,
    ]
  );

  return <AgentPanelContext value={value}>{children}</AgentPanelContext>;
};

export const useAgentPanel = (): AgentPanelContextValue => {
  const context = use(AgentPanelContext);
  if (!context) {
    throw new Error("useAgentPanel must be used within an AgentPanelProvider.");
  }
  return context;
};

/**
 * Coordinates the agent panel with the app sidebar. Opening the agent
 * collapses the sidebar to make room; closing it restores whatever state the
 * sidebar had before opening (rather than always forcing it open). On mobile
 * the sidebar is an overlay, so we leave it untouched.
 */
export const useAgentSidebarSync = () => {
  const {
    isOpen,
    isFullWidth,
    mounted,
    open,
    close,
    draft,
    setDraft,
    draftContext,
    setDraftContext,
    getSidebarStateBeforeOpen,
    setSidebarStateBeforeOpen,
  } = useAgentPanel();
  const { open: sidebarOpen, setOpen: setSidebarOpen, isMobile } = useSidebar();

  const openAgent = useCallback(
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

  const closeAgent = useCallback(() => {
    if (!isOpen) {
      return;
    }
    if (!isMobile) {
      setSidebarOpen(getSidebarStateBeforeOpen());
    }
    close();
  }, [isOpen, isMobile, setSidebarOpen, getSidebarStateBeforeOpen, close]);

  const toggleAgent = useCallback(
    (fullWidth = false) => {
      if (isOpen) {
        if (isFullWidth === fullWidth) {
          closeAgent();
        } else {
          openAgent(fullWidth);
        }
      } else {
        openAgent(fullWidth);
      }
    },
    [isOpen, isFullWidth, closeAgent, openAgent]
  );

  /**
   * Opens the panel with the composer already filled in. `context` is the
   * machine detail the agent needs and the traveller should not have to read —
   * it is appended to the message on submit rather than shown in the box.
   */
  const handOffToAgent = useCallback(
    (text: string, context = "") => {
      setDraft(text);
      setDraftContext(context);
      openAgent(false);
    },
    [openAgent, setDraft, setDraftContext]
  );

  return {
    closeAgent,
    draft,
    draftContext,
    handOffToAgent,
    isFullWidth,
    isOpen,
    mounted,
    openAgent,
    setDraft,
    setDraftContext,
    toggleAgent,
  };
};
