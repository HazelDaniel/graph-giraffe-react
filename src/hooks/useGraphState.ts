import { useEffect, useMemo, useState } from 'react';
import { useNodeEditor } from './useNodeEditor';
import type { NodeData, EdgeData, GraphEvents } from '@graph-giraffe/core';

/**
 * Core events that mutate graph structure or node/edge presentation. Any of
 * these bumps the shared graph version so `useNodes`/`useEdges` re-read the
 * store and hand consumers a fresh snapshot.
 */
const GRAPH_MUTATION_EVENTS: Array<keyof GraphEvents> = [
  'history:command',
  'connect',
  'node:drag',
  'node:dragStop',
  'node:reparent',
  'node:labelChange',
  'node:propChange',
  'subgraph:collapseToggle',
  'hub:created',
  'selection:change',
];

/**
 * Tracks a monotonically increasing version that bumps whenever the graph may
 * have changed. Shared by `useNodes` and `useEdges` so a single subscription
 * set powers both hooks.
 */
function useGraphVersion(): number {
  const editor = useNodeEditor();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const unsubscribers = GRAPH_MUTATION_EVENTS.map((event) =>
      editor.events.on(event, () => setVersion((v) => v + 1))
    );
    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [editor]);

  return version;
}

interface CoreStoreLike {
  allNodesMap: Map<number, NodeData>;
}

interface CoreEdgeStoreLike {
  allEdges(): EdgeData[];
}

/**
 * Returns the live node list (all nodes, including nested children).
 *
 * Re-reads the core store whenever the graph changes (commands, drags,
 * connects, reparents, selection, ...). Returns a fresh array on each change,
 * so memoized consumers should key off the array identity.
 *
 * Must be called inside a `<NodeEditor>` tree.
 *
 * @example
 * ```tsx
 * const nodes = useNodes();
 * ```
 */
export function useNodes(): NodeData[] {
  const editor = useNodeEditor();
  const version = useGraphVersion();

  return useMemo(() => {
    if (!editor) return [];
    const store = (editor as unknown as { store: CoreStoreLike }).store;
    return Array.from(store.allNodesMap.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, version]);
}

/**
 * Returns the live edge list.
 *
 * See {@link useNodes} for the subscription semantics.
 *
 * @example
 * ```tsx
 * const edges = useEdges();
 * ```
 */
export function useEdges(): EdgeData[] {
  const editor = useNodeEditor();
  const version = useGraphVersion();

  return useMemo(() => {
    if (!editor) return [];
    const edgeStore = (editor as unknown as { edgeStore: CoreEdgeStoreLike })
      .edgeStore;
    return edgeStore.allEdges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, version]);
}
