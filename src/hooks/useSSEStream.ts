'use client';
import { useCallback } from 'react';

export function useSSEStream() {
  const generateOpId = useCallback(() => {
    return (crypto as any)?.randomUUID?.() ?? 
           Math.random().toString(36).slice(2) + Date.now().toString(36);
  }, []);

  const openStream = useCallback((opId: string, onLog: (msg: string) => void) => {
    const eventSource = new EventSource(`/api/logs/stream?id=${opId}`);
    
    eventSource.addEventListener('log', (ev: MessageEvent) => {
      try {
        const { msg } = JSON.parse(ev.data);
        onLog(`[STREAM] ${msg}`);
      } catch {
        onLog('[STREAM] ');
      }
    });

    eventSource.addEventListener('done', () => {
      onLog('[STREAM] stream closed');
      eventSource.close();
    });

    eventSource.onerror = () => {
      onLog('[STREAM] stream error');
      eventSource.close();
    };

    return eventSource;
  }, []);

  return { generateOpId, openStream };
}
