import { useEffect, useRef } from 'react';
import { useNodeEditor } from './useNodeEditor';
import type { GraphBeforeEvents, AsyncHandler } from '@graph-giraffe/core';

/**
 * Subscribe to an async before-event hook that can block an operation.
 *
 * Return `false` from the handler to cancel the pending action.
 *
 * @example
 * ```tsx
 * useGraphBeforeEvent('before:connect', async (payload) => {
 *   // Prevent self-loops at the type level
 *   if (payload.sourceType === payload.targetType) return false;
 *   return true;
 * });
 * ```
 */
export function useGraphBeforeEvent<K extends keyof GraphBeforeEvents>(
  event: K,
  handler: AsyncHandler<GraphBeforeEvents[K]>,
): void {
  const editor = useNodeEditor();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!editor) return;

    const wrappedHandler: AsyncHandler<GraphBeforeEvents[K]> = (payload) => {
      return handlerRef.current(payload);
    };

    return editor.events.onBefore(event, wrappedHandler);
  }, [editor, event]);
}
