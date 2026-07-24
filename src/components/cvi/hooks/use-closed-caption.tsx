import { useCallback, useRef, useState } from 'react';
import { useObservableEvent, type TavusEvent, type TavusRole } from './cvi-events-hooks';

const CAPTION_CLEAR_DELAY_MS = 2000;

export interface Caption {
  role: TavusRole;
  text: string;
}

export const useClosedCaption = (): Caption | null => {
  const [caption, setCaption] = useState<Caption | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((next: Caption, final: boolean) => {
    setCaption(next);
    if (clearTimer.current !== null) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    if (final) {
      clearTimer.current = setTimeout(() => {
        setCaption(null);
        clearTimer.current = null;
      }, CAPTION_CLEAR_DELAY_MS);
    }
  }, []);

  useObservableEvent(
    useCallback(
      (event: TavusEvent) => {
        if (event.event_type === 'conversation.utterance.streaming') {
          const role = event.properties?.role;
          const speech = event.properties?.speech;
          const final = event.properties?.final;
          if ((role === 'user' || role === 'replica') && typeof speech === 'string') {
            update({ role, text: speech }, final ?? false);
          }
        }
      },
      [update]
    )
  );

  return caption;
};
