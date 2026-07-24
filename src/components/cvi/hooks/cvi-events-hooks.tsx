import { useCallback } from 'react';
import { useAppMessage, useDailyEvent } from '@daily-co/daily-react';

// Tavus Interactions Protocol events arrive over Daily's `app-message` channel.
// See https://docs.tavus.io/sections/conversational-video-interface/interactions-protocols/overview

export type TavusRole = 'user' | 'replica';

export interface TavusEvent {
  message_type?: string;
  event_type?: string;
  conversation_id?: string;
  inference_id?: string;
  properties?: {
    role?: TavusRole;
    speech?: string;
    text?: string;
    final?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function useObservableEvent(callback: (event: TavusEvent) => void) {
  return useDailyEvent(
    'app-message',
    useCallback(
      (event: { data: TavusEvent }) => {
        callback(event.data);
      },
      [callback]
    )
  );
}

export function useSendAppMessage() {
  const sendAppMessage = useAppMessage();

  return useCallback(
    (message: Record<string, unknown>) => {
      sendAppMessage(message, '*');
    },
    [sendAppMessage]
  );
}
