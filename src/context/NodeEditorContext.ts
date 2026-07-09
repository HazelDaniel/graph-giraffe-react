import { createContext } from 'react';
import type { NodeEditor } from '@graph-giraffe/core';

export interface NodeEditorContextValue {
  /** The initialized NodeEditor instance, or null while loading. */
  editor: NodeEditor | null;
}

export const NodeEditorContext = createContext<NodeEditorContextValue>({
  editor: null,
});
