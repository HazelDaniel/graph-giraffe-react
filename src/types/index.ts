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
  NodeTypeDescriptor,
  NodeTypeRegistry,
  DomNodeRenderer,
  DomNodeViewContext,
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
  registerDomViews,
  DOM_VIEW_TAGS,
  createCustomElementDomRenderer,
  toDomDescriptor,
  DOM_NODE_DESCRIPTORS,
  registerDomNodeDescriptors,
} from '@graph-giraffe/core';

// ─── Wrapper-specific types ─────────────────────────────

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type {
  NodeEditor,
  NodeData,
  EdgeData,
  ConnectionMode,
  NodeType,
  HandleSide,
  NodeEditorConfig,
  AddUploadedTextureParams,
  DomNodeViewContext,
  GraphEvents,
  GraphBeforeEvents,
  SyncHandler,
  AsyncHandler,
} from '@graph-giraffe/core';

/**
 * Built-in node type names. Skins may be provided for any of these (or any
 * custom type via the generic `skins` record).
 */
export type BuiltinNodeType =
  | 'node'
  | 'hub'
  | 'branch'
  | 'group'
  | 'composition'
  | 'composition-child'
  | 'subgraph';

/**
 * Props passed to a DOM skin component. Mirrors the core `DomNodeViewContext`
 * exactly, so a skin receives the node's live state on every update.
 */
export type NodeSkinProps = DomNodeViewContext;

/** A declarative DOM skin for a node type. */
export type NodeSkinComponent = ComponentType<NodeSkinProps>;

/**
 * Props accepted by the `<NodeEditor>` component.
 */
export interface NodeEditorProps {
  // ── Configuration ──────────────────────────────────────
  /** Connection wiring mode: `"node"` (default) or `"group"`. */
  connectionMode?: ConnectionMode;
  /** Custom handle appearance. */
  handleStyle?: NodeEditorConfig['handleStyle'];
  /** Base path for fetching core assets (atlases). Defaults to 'assets'. */
  assetsPath?: string;
  /** Texture skins to register on initialisation. */
  textureSkins?: AddUploadedTextureParams[];
  /** Enable verbose event logging to the console. */
  debug?: boolean;

  /**
   * Rendering pipeline for node bodies: `"webgl"` (default, GPU) or `"dom"`
   * (custom-element / React skins). In `"dom"` mode the wrapper replaces every
   * built-in type with its DOM descriptor — either the bundled DOM skins or a
   * React component provided via the skin props. WebGL picking, handles and
   * hit-testing remain authoritative in both modes.
   */
  renderMode?: 'webgl' | 'dom';

  // ── Declarative DOM skins (require `renderMode: "dom"`) ──
  /**
   * Generic skin map keyed by node type (built-ins and custom types alike).
   * Overrides the per-type convenience props below when both are set.
   */
  skins?: Partial<Record<BuiltinNodeType | string, NodeSkinComponent>>;
  /** DOM skin for the `node` primitive. */
  nodeSkin?: NodeSkinComponent;
  /** DOM skin for the `hub` primitive. */
  hubSkin?: NodeSkinComponent;
  /** DOM skin for the `branch` primitive. */
  branchSkin?: NodeSkinComponent;
  /** DOM skin for the `group` container. */
  groupSkin?: NodeSkinComponent;
  /** DOM skin for the `composition` container. */
  compositionSkin?: NodeSkinComponent;
  /** DOM skin for the `composition-child` primitive. */
  compositionChildSkin?: NodeSkinComponent;
  /** DOM skin for the `subgraph` container. */
  subgraphSkin?: NodeSkinComponent;

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
