import { useCallback, useMemo, useReducer } from 'react';
import {
  useObservableEvent,
  useSendAppMessage,
  type TavusEvent,
  type TavusRole,
} from './cvi-events-hooks';

export interface ChatMessage {
  id: string;
  role: TavusRole;
  text: string;
  createdAt: number;
}

export function makeMessageId(inferenceId: string | undefined, role: string) {
  return `${inferenceId ?? 'unknown'}:${role}`;
}

function applyUtterance(
  prev: ChatMessage[],
  event: TavusEvent,
  now: number
): ChatMessage[] {
  const speech = event.properties?.speech;
  const role = event.properties?.role;
  if (!speech || (role !== 'user' && role !== 'replica')) {
    return prev;
  }
  const id = makeMessageId(event.inference_id, role);

  let base = prev;
  if (role === 'user') {
    // Drop the optimistic local echo once the server confirms the utterance.
    const trimmed = speech.trim();
    base = prev.filter(
      (m) =>
        !(m.id.startsWith('local-') && m.role === 'user' && m.text.trim() === trimmed)
    );
  }

  const existingIdx = base.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    const next = base.slice();
    next[existingIdx] = { ...next[existingIdx], text: speech };
    return next;
  }
  return [...base, { id, role, text: speech, createdAt: now }];
}

type State = { messages: ChatMessage[]; conversationId: string | null };

type Action =
  | { type: 'utterance'; event: TavusEvent; now: number }
  | { type: 'optimistic'; text: string; id: string; now: number };

function chatReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'utterance':
      return {
        messages: applyUtterance(state.messages, action.event, action.now),
        conversationId:
          state.conversationId ?? action.event.conversation_id ?? null,
      };
    case 'optimistic':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.id, role: 'user', text: action.text, createdAt: action.now },
        ],
      };
  }
}

function generateLocalId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return `local-${cryptoObj.randomUUID()}`;
  }
  return `local-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function useChat(initialConversationId?: string) {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    conversationId: initialConversationId ?? null,
  });
  const sendAppMessage = useSendAppMessage();

  useObservableEvent(
    useCallback((event: TavusEvent) => {
      if (event.event_type === 'conversation.utterance') {
        dispatch({ type: 'utterance', event, now: Date.now() });
      }
    }, [])
  );

  const conversationId = state.conversationId ?? initialConversationId ?? null;

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId) {
        return;
      }
      const id = generateLocalId();
      dispatch({ type: 'optimistic', text: trimmed, id, now: Date.now() });
      sendAppMessage({
        message_type: 'conversation',
        event_type: 'conversation.respond',
        conversation_id: conversationId,
        properties: { text: trimmed },
      });
    },
    [conversationId, sendAppMessage]
  );

  return useMemo(
    () => ({ messages: state.messages, conversationId, sendMessage }),
    [state.messages, conversationId, sendMessage]
  );
}
