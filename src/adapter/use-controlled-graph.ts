import { useEffect, useRef, useState } from "react";
import type { NodeEditor } from "@graph-giraffe/core";
import type { ControlledEdge, ControlledNode, NodePositionChange } from "../types";
import { syncControlledGraph } from "./controlled-graph";

export function useControlledGraph(
  editor: NodeEditor | null,
  nodes: ControlledNode[] | undefined,
  edges: ControlledEdge[] | undefined,
  onNodePositionChange: ((changes: NodePositionChange[]) => void) | undefined
): number {
  const [graphVersion, setGraphVersion] = useState(0);
  const fingerprintRef = useRef<string | null>(null);
  const draggingRef = useRef(false);
  const pendingRef = useRef(false);
  const propsRef = useRef({ nodes, edges, onNodePositionChange });
  propsRef.current = { nodes, edges, onNodePositionChange };

  useEffect(() => {
    if (!editor || !nodes || !edges) return;
    if (draggingRef.current) {
      pendingRef.current = true;
      return;
    }
    if (syncControlledGraph(editor, nodes, edges, fingerprintRef)) {
      setGraphVersion((version) => version + 1);
    }
  }, [editor, nodes, edges]);

  useEffect(() => {
    if (!editor) return;

    const onDragStart = (): void => {
      draggingRef.current = true;
    };

    const onDragStop = (): void => {
      draggingRef.current = false;
      const positionChanges: NodePositionChange[] = [];
      const currentNodes = propsRef.current.nodes;
      if (currentNodes) {
        const previousById = new Map(currentNodes.map((node) => [node.id, node]));
        // A container drag translates its descendants in core even though the
        // drag-stop payload contains only the dragged root. Compare every live
        // world position with controlled state so the adapter commits the
        // translated subtree instead of restoring stale child coordinates.
        for (const node of editor.getNodes()) {
          const previous = previousById.get(node.id);
          const position = editor.getNodeWorldPosition(node.id);
          if (!previous || !position) continue;
          if (
            previous.position.x !== position.x ||
            previous.position.y !== position.y
          ) {
            positionChanges.push({ id: node.id, position });
          }
        }
      }
      if (positionChanges.length) propsRef.current.onNodePositionChange?.(positionChanges);

      const current = propsRef.current;
      if (current.nodes && current.edges) {
        fingerprintRef.current = JSON.stringify([
          current.nodes.map((node) => {
            const position = editor.getNodeWorldPosition(node.id);
            return position ? { ...node, position } : node;
          }),
          current.edges,
        ]);
      }

      if (pendingRef.current) {
        pendingRef.current = false;
        const next = propsRef.current;
        if (next.nodes && next.edges && syncControlledGraph(editor, next.nodes, next.edges, fingerprintRef)) {
          setGraphVersion((version) => version + 1);
        }
      }
    };

    const offStart = editor.events.on("node:dragStart", onDragStart);
    const offStop = editor.events.on("node:dragStop", onDragStop);
    return () => {
      offStart();
      offStop();
    };
  }, [editor]);

  return graphVersion;
}
