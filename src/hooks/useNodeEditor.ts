import { useContext } from 'react';
import { NodeEditorContext } from '../context/NodeEditorContext';
import type { NodeEditor } from '@graph-giraffe/core';

/**
 * Returns the active `NodeEditor` instance from context.
 *
 * Must be called inside a `<NodeEditor>` tree.
 * Returns `null` while the editor is still initializing.
 */
export function useNodeEditor(): NodeEditor | null {
  const { editor } = useContext(NodeEditorContext);
  return editor;
}
