import { useEffect, useState } from 'react';
import { useNodeEditor } from './useNodeEditor';
import type { Viewport } from '../types';

/**
 * Returns the live camera viewport `{ x, y, zoom }`.
 *
 * Subscribes to the core `camera:change` event, so the value updates on every
 * pan/zoom (including animated `panTo` flights) and re-renders the consumer.
 *
 * Must be called inside a `<NodeEditor>` tree.
 *
 * @example
 * ```tsx
 * const { x, y, zoom } = useViewport();
 * ```
 */
export function useViewport(): Viewport {
  const editor = useNodeEditor();
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    if (!editor) return;
    const sync = (): void => {
      const { panX, panY, zoom } = editor.getCameraState();
      setViewport({ x: panX, y: panY, zoom });
    };
    sync();
    return editor.events.on('camera:change', sync);
  }, [editor]);

  return viewport;
}
