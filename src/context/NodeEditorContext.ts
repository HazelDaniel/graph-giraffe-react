import { createContext } from 'react';
import type { NodeEditor } from '@graph-giraffe/core';

export interface NodeEditorContextValue {
  /** The initialized NodeEditor instance, or null while loading. */
  editor: NodeEditor | null;
  /**
   * Monotonically increasing counter bumped whenever the wrapper mutates the
   * graph outside core's event stream (e.g. controlled `importGraph` sync).
   * State hooks like `useNodes`/`useEdges` depend on it to re-read the store.
   */
  graphVersion: number;
}

export const NodeEditorContext = createContext<NodeEditorContextValue>({
  editor: null,
  graphVersion: 0,
});
