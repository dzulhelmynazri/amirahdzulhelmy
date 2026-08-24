"use client";

import type { ClientSessionState, MessageStreamEvent } from "eve/client";
import { useEveAgent } from "eve/react";
import type {
  EveMessage,
  EveMessageData,
  UseEveAgentHelpers,
  UseEveAgentStatus,
} from "eve/react";
import { usePathname } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

const AGENT_NAME = "flight-guardian";
const STORAGE_KEY = "atlas:eve:flight-guardian:v1";
const CHANGE_EVENT = "atlas-eve-chat-change";

interface SavedEveChat {
  events?: readonly MessageStreamEvent[];
  session?: ClientSessionState;
}

interface EveChatState {
  error: Error | undefined;
  messages: readonly EveMessage[];
  ready: boolean;
  status: UseEveAgentStatus;
}

interface EveChatActions {
  cancel: UseEveAgentHelpers<EveMessageData>["cancel"];
  reset: () => void;
  respond: UseEveAgentHelpers<EveMessageData>["respond"];
  send: (text: string) => Promise<void>;
}

interface EveChatContextValue {
  actions: EveChatActions;
  state: EveChatState;
}

const EveChatContext = createContext<EveChatContextValue | null>(null);

const EMPTY_SAVED: SavedEveChat = {};

let snapshotInitialized = false;
let snapshotRaw: string | null = null;
let snapshotValue: SavedEveChat = EMPTY_SAVED;

const isSessionState = (value: unknown): value is ClientSessionState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.sessionId === "string" &&
    typeof record.streamIndex === "number"
  );
};

const parseSavedChat = (raw: string | null): SavedEveChat => {
  if (!raw) {
    return EMPTY_SAVED;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return EMPTY_SAVED;
    }
    const record = parsed as Record<string, unknown>;
    const saved: SavedEveChat = {};
    if (Array.isArray(record.events)) {
      saved.events = record.events as MessageStreamEvent[];
    }
    if (isSessionState(record.session)) {
      saved.session = record.session;
    }
    return saved;
  } catch {
    return EMPTY_SAVED;
  }
};

const getSavedChatSnapshot = (): SavedEveChat => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (snapshotInitialized && raw === snapshotRaw) {
    return snapshotValue;
  }
  snapshotInitialized = true;
  snapshotRaw = raw;
  snapshotValue = parseSavedChat(raw);
  return snapshotValue;
};

const getServerSavedChatSnapshot = (): SavedEveChat => EMPTY_SAVED;

const notifySavedChat = (): void => {
  snapshotInitialized = false;
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribeSavedChat = (onStoreChange: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      snapshotInitialized = false;
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
};

const persistSavedChat = (saved: SavedEveChat): void => {
  try {
    const serialized = JSON.stringify(saved);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    snapshotInitialized = true;
    snapshotRaw = serialized;
    snapshotValue = saved;
  } catch {
    try {
      const serialized = JSON.stringify({ session: saved.session });
      window.localStorage.setItem(STORAGE_KEY, serialized);
      snapshotInitialized = true;
      snapshotRaw = serialized;
      snapshotValue = { session: saved.session };
    } catch {
      // storage unavailable or over quota
    }
  }
};

const clearSavedChat = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
  snapshotInitialized = true;
  snapshotRaw = null;
  snapshotValue = EMPTY_SAVED;
  notifySavedChat();
};

const EveChatSession = ({
  children,
  saved,
}: {
  children: ReactNode;
  saved: SavedEveChat;
}) => {
  const pathname = usePathname();

  const persistSnapshot = useCallback(
    (snapshot: {
      events: readonly MessageStreamEvent[];
      session: ClientSessionState | undefined;
    }) => {
      persistSavedChat({
        events: snapshot.events,
        session: snapshot.session,
      });
    },
    []
  );

  const agent = useEveAgent({
    agent: AGENT_NAME,
    initialEvents: saved.events ?? [],
    initialSession: saved.session,
    onError: (error) => {
      toast.error(error.message);
    },
    onFinish: (snapshot) => {
      persistSnapshot(snapshot);
    },
    onSessionChange: (session) => {
      if (!session) {
        return;
      }
      const previous = getSavedChatSnapshot();
      const sameSession = previous.session?.sessionId === session.sessionId;
      persistSavedChat({
        events: sameSession ? previous.events : [],
        session,
      });
    },
    prepareSend: (input) => ({
      ...input,
      clientContext: { route: pathname },
    }),
  });

  const send = useCallback(
    async (text: string) => {
      const isBusy =
        agent.status === "submitted" || agent.status === "streaming";
      if (isBusy) {
        return;
      }
      await agent.send(text);
    },
    [agent]
  );

  const reset = useCallback(() => {
    agent.reset();
    clearSavedChat();
  }, [agent]);

  const value = useMemo<EveChatContextValue>(
    () => ({
      actions: {
        cancel: agent.cancel,
        reset,
        respond: agent.respond,
        send,
      },
      state: {
        error: agent.error,
        messages: agent.data.messages,
        ready: true,
        status: agent.status,
      },
    }),
    [
      agent.cancel,
      agent.data.messages,
      agent.error,
      agent.respond,
      agent.status,
      reset,
      send,
    ]
  );

  return <EveChatContext value={value}>{children}</EveChatContext>;
};

/**
 * Owns the Flight Guardian `useEveAgent` session once for the protected
 * shell. AtlasAgent mounts twice (mobile overlay + desktop pane), so the
 * hook cannot live in the panel itself.
 */
export const EveChatProvider = ({ children }: { children: ReactNode }) => {
  const saved = useSyncExternalStore(
    subscribeSavedChat,
    getSavedChatSnapshot,
    getServerSavedChatSnapshot
  );

  return (
    <EveChatSession key={saved.session?.sessionId ?? "new"} saved={saved}>
      {children}
    </EveChatSession>
  );
};

export const useEveChat = (): EveChatContextValue => {
  const context = use(EveChatContext);
  if (!context) {
    throw new Error("useEveChat must be used within an EveChatProvider.");
  }
  return context;
};
