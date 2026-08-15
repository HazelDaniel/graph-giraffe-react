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
 * Wraps every React skin (and its node subtree) in a provider tree.
 *
 * Use it to inject contexts the skins depend on — Redux, theme, i18n, etc.
 * The wrapper receives the skin's children and must render them.
 */
export type NodeSkinWrapper = ComponentType<{ children: ReactNode }>;

/** Camera viewport state: pan (x/y) and zoom. */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

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
  /**
   * Provider wrapper rendered around every React skin's subtree. Required when
   * skins consume external contexts (Redux, theme, ...).
   */
  skinWrapper?: NodeSkinWrapper;

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
  /**
   * Create a node through the editor's command path (undoable, emits
   * `history:command` so DOM views reconcile, `before:nodeCreate` hooks can
   * block). Resolves with the created node, or `null` if blocked.
   */
  addNode(
    x: number,
    y: number,
    label: string,
    type?: NodeType
  ): Promise<NodeData | null>;
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

  // ── Camera / coordinate operations ─────────────────────
  /** Convert a screen-space pixel coordinate to world coordinates. */
  screenToWorld(
    screenX: number,
    screenY: number
  ): { x: number; y: number };
  /** Convert a world coordinate to screen-space pixels. */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number };
  /** The current camera viewport state. */
  getViewport(): Viewport;
  /**
   * Immediately set the camera viewport. Zoom is clamped by the core camera
   * (0.1–5).
   */
  setViewport(x: number, y: number, zoom: number): void;
  /**
   * Smoothly animate the camera so the given world coordinate lands at a
   * screen position (default: canvas center). Resolves when the camera
   * reaches its destination.
   */
  panTo(
    worldX: number,
    worldY: number,
    options?: { zoom?: number; screenX?: number; screenY?: number }
  ): Promise<void>;
  /**
   * World position of a node (sum of local positions up the parent chain).
   */
  getNodeWorldPosition(id: number): { x: number; y: number } | undefined;
  /** Screen position of a node (its world position projected by the camera). */
  getNodeScreenPosition(id: number): { x: number; y: number } | undefined;
}
