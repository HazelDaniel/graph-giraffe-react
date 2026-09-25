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

function graphMatchesEditor(
  editor: NodeEditor,
  nodes: ControlledNode[],
  edges: ControlledEdge[]
): boolean {
  if (editor.getNodeCount() !== nodes.length) return false;

  for (const node of nodes) {
    const current = editor.getNode(node.id);
    const position = editor.getNodeWorldPosition(node.id);
    if (!current || !position) return false;
    if (current.nodeType !== node.type || current.parentId !== (node.parentId ?? null)) {
      return false;
    }
    if (position.x !== node.position.x || position.y !== node.position.y) return false;
    if (current.width !== node.width || current.height !== node.height) return false;
    if (current.text !== (node.label ?? node.type)) return false;
    if (current.isLocked !== Boolean(node.locked)) return false;
    if (JSON.stringify(current.props) !== JSON.stringify(node.props)) return false;
  }

  if (editor.getEdgeCount() !== edges.length) return false;
  for (const edge of edges) {
    const current = editor.getEdge(edge.id);
    if (!current) return false;
    if (
      current.sourceNodeId !== edge.source ||
      current.targetNodeId !== edge.target ||
      current.sourceHandleSide !== (edge.sourceHandle ?? "right") ||
      current.targetHandleSide !== (edge.targetHandle ?? "left")
    ) {
      return false;
    }
  }

  return true;
}

export function syncControlledGraph(
  editor: NodeEditor,
  nodes: ControlledNode[],
  edges: ControlledEdge[],
  fingerprint: { current: string | null }
): boolean {
  const next = JSON.stringify([nodes, edges]);
  if (fingerprint.current === next) return false;
  if (graphMatchesEditor(editor, nodes, edges)) {
    fingerprint.current = next;
    return false;
  }
  editor.applyControlledGraph(nodes.map(toCoreNode), edges.map(toCoreEdge));
  fingerprint.current = next;
  return true;
}
