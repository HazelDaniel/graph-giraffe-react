import type { ControlledEdge, ControlledNode } from "../types";
import type { NodeEditor } from "@graph-giraffe/core";

function toCoreNode(node: ControlledNode) {
  return {
    id: node.id,
    nodeType: node.type,
    position: node.position,
    parentId: node.parentId ?? null,
    width: node.width,
    height: node.height,
    label: node.label,
    props: node.props,
    isLocked: node.locked,
  };
}

function toCoreEdge(edge: ControlledEdge) {
  return {
    id: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceHandleSide: edge.sourceHandle ?? "right",
    targetHandleSide: edge.targetHandle ?? "left",
    edgeType: "cubic" as const,
    headType: "arrow" as const,
    headSkinId: "arrow" as const,
  };
}

export function syncControlledGraph(
  editor: NodeEditor,
  nodes: ControlledNode[],
  edges: ControlledEdge[],
  fingerprint: { current: string | null }
): boolean {
  const next = JSON.stringify([nodes, edges]);
  if (fingerprint.current === next) return false;
  editor.applyControlledGraph(nodes.map(toCoreNode), edges.map(toCoreEdge));
  fingerprint.current = next;
  return true;
}
