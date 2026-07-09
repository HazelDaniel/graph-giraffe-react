import { useEffect, useRef } from 'react';
import { useNodeEditor } from './useNodeEditor';
import type { GraphEvents, SyncHandler } from '@graph-giraffe/core';

/**
 * Subscribe to a synchronous graph event.
 *
 * The handler is automatically registered when the editor becomes
 * available and cleaned up on unmount or when the handler reference changes.
 *
 * @example
 * ```tsx
 * useGraphEvent('node:click', (payload) => {
 *   console.log('Clicked node', payload.nodeId);
 * });
 * ```
 */
export function useGraphEvent<K extends keyof GraphEvents>(
  event: K,
  handler: SyncHandler<GraphEvents[K]>,
): void {
  const editor = useNodeEditor();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!editor) return;

    const wrappedHandler: SyncHandler<GraphEvents[K]> = (payload) => {
      handlerRef.current(payload);
    };

    return editor.events.on(event, wrappedHandler);
  }, [editor, event]);
}
