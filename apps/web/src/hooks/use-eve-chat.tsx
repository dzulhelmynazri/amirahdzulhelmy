"use client";

import type { ClientSessionState, MessageStreamEvent } from "eve/client";
import { useEveAgent } from "eve/react";
import type {
  EveMessage,
  EveMessageData,
  UseEveAgentHelpers,
  UseEveAgentStatus,
} from "eve/react";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  getConversation,
  removeConversation,
  saveConversation,
} from "@/app/actions/conversations";

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
  /**
   * Forgets a conversation everywhere it is held.
   *
   * A chat lives in two places: the row that makes it findable, and the
   * localStorage snapshot the panel actually draws from. Deleting only the row
   * leaves the transcript on screen with nothing behind it, and the next reply
   * writes the row straight back — the delete undoes itself.
   */
  deleteConversation: (sessionId: string) => Promise<void>;
  /** Replaces the panel's contents with a stored conversation. */
  openConversation: (sessionId: string) => Promise<void>;
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

interface ReceivedMessage {
  message?: unknown;
  parts?: unknown;
}

const partsToText = (parts: unknown): string => {
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) =>
      typeof part === "object" && part !== null && "text" in part
        ? String((part as { text: unknown }).text)
        : ""
    )
    .join(" ")
    .trim();
};

/**
 * The opening line, used to title the chat.
 *
 * Reads `message.received`, which is the event eve actually emits for
 * something the traveller typed. This looked for a `role` and a `text` field
 * that no event carries, so it returned nothing every single time and every
 * chat in the history was titled "New chat".
 */
const firstUserMessage = (
  events: readonly MessageStreamEvent[]
): string | undefined => {
  for (const event of events) {
    if (event.type !== "message.received") {
      continue;
    }

    const { data } = event as { data?: ReceivedMessage };

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }

    const text = partsToText(data?.parts);

    if (text) {
      return text;
    }
  }
};

/**
 * How long to wait before treating a second failure as real.
 *
 * One reattach per five seconds. Without a floor a session that fails on
 * attach would remount, fail, remount — a loop that looks like a hung panel
 * and quietly re-runs the request.
 */
const REATTACH_COOLDOWN_MS = 5000;

const EveChatSession = ({
  children,
  onStreamLost,
  saved,
}: {
  children: ReactNode;
  onStreamLost: () => void;
  saved: SavedEveChat;
}) => {
  const lastReattach = useRef(0);
  const persistSnapshot = useCallback(
    (snapshot: {
      events: readonly MessageStreamEvent[];
      session: ClientSessionState | undefined;
    }) => {
      persistSavedChat({
        events: snapshot.events,
        session: snapshot.session,
      });

      // Also to the database, so a chat outlives this browser. localStorage
      // stays the fast path for the conversation on screen; the row is what
      // makes it findable tomorrow, or from another device.
      const sessionId = snapshot.session?.sessionId;

      if (sessionId) {
        void saveConversation({
          firstMessage: firstUserMessage(snapshot.events),
          payload: { events: snapshot.events, session: snapshot.session },
          sessionId,
        });
      }
    },
    []
  );

  const agent = useEveAgent({
    agent: AGENT_NAME,
    initialEvents: saved.events ?? [],
    initialSession: saved.session,
    /**
     * A dropped connection is not a failed turn.
     *
     * eve's stream is durable and the session cursor is stored, so the run
     * carries on server-side whatever happens to this socket. Measured: a
     * search that showed "network error" in the panel had already finished
     * on the server, with fares and all — the traveller was told it broke
     * while it was busy succeeding.
     *
     * So the first drop reattaches instead of complaining. The remount
     * replays from the stored cursor and the transcript refills. Only a
     * second failure inside the cooldown is reported, because by then it is
     * probably not the socket.
     */
    onError: (error) => {
      const now = Date.now();
      const canReattach =
        saved.session !== undefined &&
        now - lastReattach.current > REATTACH_COOLDOWN_MS;

      if (canReattach) {
        lastReattach.current = now;
        onStreamLost();
        return;
      }

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
      // Read at send time rather than through usePathname, which would make
      // every page under this provider un-prerenderable for a value the
      // render never uses. The agent only needs to know which page the
      // traveller was on when they typed.
      clientContext: { route: window.location.pathname },
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

  /**
   * Clearing the panel is not a courtesy here, it is what makes the delete
   * stick. `onFinish` writes the row back for whatever session is live, so a
   * deleted conversation that is still on screen returns the moment the
   * traveller says anything else. Resetting moves the panel onto a fresh
   * session id, which is the only thing that stops that write.
   */
  const currentSessionId = agent.session?.sessionId;

  const deleteConversation = useCallback(
    async (sessionId: string) => {
      await removeConversation(sessionId);

      if (sessionId === currentSessionId) {
        reset();
      }
    },
    [currentSessionId, reset]
  );

  /**
   * Writes the stored snapshot into the same slot the live chat reads from,
   * then announces the change. The provider is keyed on the session id, so it
   * remounts around the restored conversation rather than trying to merge two
   * transcripts.
   */
  const openConversation = useCallback(async (sessionId: string) => {
    const stored = await getConversation(sessionId);
    const restored = parseSavedChat(JSON.stringify(stored?.payload ?? {}));

    if (!restored.session) {
      toast.error("That conversation could not be reopened.");
      return;
    }

    persistSavedChat(restored);
    notifySavedChat();
  }, []);

  const value = useMemo<EveChatContextValue>(
    () => ({
      actions: {
        cancel: agent.cancel,
        deleteConversation,
        openConversation,
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
      deleteConversation,
      openConversation,
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
  // Bumped to reattach after a dropped stream. It is in the key because the
  // session id has not changed — remounting is what makes `useEveAgent` pick
  // the stream back up from the stored cursor.
  const [attempt, setAttempt] = useState(0);

  return (
    <EveChatSession
      key={`${saved.session?.sessionId ?? "new"}:${attempt}`}
      onStreamLost={() => setAttempt((value) => value + 1)}
      saved={saved}
    >
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
