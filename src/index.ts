/**
 * @graph-giraffe/react — Public API
 */

// ─── Component ───────────────────────────────────────────
export { NodeEditor } from './components/NodeEditor';
export { ViewportPortal } from './components/ViewportPortal';
export type { ViewportPortalProps } from './components/ViewportPortal';

// ─── Context ─────────────────────────────────────────────
export { NodeEditorContext } from './context/NodeEditorContext';
export type { NodeEditorContextValue } from './context/NodeEditorContext';

// ─── Hooks ───────────────────────────────────────────────
export { useNodeEditor } from './hooks/useNodeEditor';
export { useGraphEvent } from './hooks/useGraphEvent';
export { useGraphBeforeEvent } from './hooks/useGraphBeforeEvent';
export { useViewport } from './hooks/useViewport';
export { useNodes, useEdges } from './hooks/useGraphState';

// ─── Types ───────────────────────────────────────────────
export * from './types';
