/**
 * @graph-giraffe/react — Type re-exports and wrapper-specific types.
 *
 * All core types are re-exported so consumers only need a single import source.
 */

// ─── Re-export every public core type ────────────────────
export type {
  NodeEditorConfig,
  NodeData,
  EdgeData,
  NodeType,
  ContainerNodeType,
  LeafNodeType,
  CandidateNodeType,
  EdgeType,
  EdgeHeadType,
  EdgeHeadSkinId,
  HandleSide,
  HandleShape,
  HandleStyle,
  NodeHandleData,
  ConnectionMode,
  ThemeName,
  ThemeStyle,
  TextureKind,
  TextureSource,
  TextureSourceType,
  NodeTextureIds,
  AddUploadedTextureParams,
  NodePropType,
  NodePropPrimitive,
  PropChangePayload,
  ConnectionPreviewData,
  GeometryType,
  GeometryMeshType,
  BGGeometryMeshType,
  GraphEvents,
  GraphBeforeEvents,
  SyncHandler,
  AsyncHandler,
} from '@graph-giraffe/core';

export {
  NODE_LAYOUT,
  NODE_SIZE,
  HANDLE_LAYOUT,
  DEFAULT_HANDLE_STYLE,
  isContainerNodeType,
  isLeafNodeType,
  isNodePrimitiveType,
  isCandidateNodeType,
  getDefaultNodeSize,
  GraphEventEmitter,
  TextureRegistry,
  generateTetureSkinOption,
  getDefaultTextureIds,
  getCompositionReferenceTextureIds,
} from '@graph-giraffe/core';

// ─── Wrapper-specific types ─────────────────────────────

import type { CSSProperties, ReactNode } from 'react';
import type {
  NodeEditor,
  NodeData,
  EdgeData,
  ConnectionMode,
  NodeType,
  HandleSide,
  NodeEditorConfig,
  AddUploadedTextureParams,
  GraphEvents,
  GraphBeforeEvents,
  SyncHandler,
  AsyncHandler,
} from '@graph-giraffe/core';

/**
 * Props accepted by the `<NodeEditor>` component.
 */
export interface NodeEditorProps {
  // ── Configuration ──────────────────────────────────────
  /** Connection wiring mode: `"node"` (default) or `"group"`. */
  connectionMode?: ConnectionMode;
  /** Custom handle appearance. */
  handleStyle?: NodeEditorConfig['handleStyle'];
  /** Texture skins to register on initialisation. */
  textureSkins?: AddUploadedTextureParams[];
  /** Enable verbose event logging to the console. */
  debug?: boolean;

  // ── Sync event callbacks ───────────────────────────────
  onConnect?: SyncHandler<GraphEvents['connect']>;
  onNodeClick?: SyncHandler<GraphEvents['node:click']>;
  onNodeDragStart?: SyncHandler<GraphEvents['node:dragStart']>;
  onNodeDrag?: SyncHandler<GraphEvents['node:drag']>;
  onNodeDragStop?: SyncHandler<GraphEvents['node:dragStop']>;
  onEdgeClick?: SyncHandler<GraphEvents['edge:click']>;
  onPaneClick?: SyncHandler<GraphEvents['pane:click']>;
  onNodeLabelChange?: SyncHandler<GraphEvents['node:labelChange']>;
  onNodePropChange?: SyncHandler<GraphEvents['node:propChange']>;
  onNodeReparent?: SyncHandler<GraphEvents['node:reparent']>;
  onSelectionChange?: SyncHandler<GraphEvents['selection:change']>;
  onSubgraphCollapseToggle?: SyncHandler<GraphEvents['subgraph:collapseToggle']>;
  onHubCreated?: SyncHandler<GraphEvents['hub:created']>;

  // ── Async before-event hooks ───────────────────────────
  onBeforeConnect?: AsyncHandler<GraphBeforeEvents['before:connect']>;
  onBeforeNodeCreate?: AsyncHandler<GraphBeforeEvents['before:nodeCreate']>;
  onBeforeNodeDelete?: AsyncHandler<GraphBeforeEvents['before:nodeDelete']>;
  onBeforeNodeReparent?: AsyncHandler<GraphBeforeEvents['before:nodeReparent']>;

  // ── Layout / styling ───────────────────────────────────
  /** CSS class applied to the outer container. */
  className?: string;
  /** Inline styles merged onto the outer container. */
  style?: CSSProperties;
  /** React children rendered *after* the editor initialises. */
  children?: ReactNode;
}

/**
 * Imperative handle exposed via `ref` on `<NodeEditor>`.
 */
export interface NodeEditorHandle {
  /** The underlying core editor instance (null while loading). */
  readonly editor: NodeEditor | null;

  // ── Node operations ────────────────────────────────────
  addNode(x: number, y: number, label: string, type?: NodeType): NodeData | undefined;
  removeNode(id: number): void;
  getNode(id: number): NodeData | undefined;
  getNodes(): NodeData[];

  // ── Edge operations ────────────────────────────────────
  addEdge(params: {
    sourceNodeId: number;
    sourceHandleSide: HandleSide;
    targetNodeId: number;
    targetHandleSide: HandleSide;
  }): EdgeData | null;
  removeEdge(id: number): EdgeData | null;
  getEdges(): EdgeData[];

  // ── Editor operations ──────────────────────────────────
  setConnectionMode(mode: ConnectionMode): void;
}
