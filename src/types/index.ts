/**
 * @graph-giraffe/react — Type re-exports and wrapper-specific types.
 *
 * All core types are re-exported so consumers only need a single import source.
 */

// ─── Re-export every public core type ────────────────────
export type {
  NodeEditorConfig,
  CreateEdgeParams,
  NodeData,
  EdgeData,
  GraphProjection,
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
  PrimitiveBoundsAuthority,
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
  NodeTypeDescriptor,
  HandleSide,
  NodeEditorConfig,
  CreateEdgeParams,
  AddUploadedTextureParams,
  DomNodeViewContext,
  GraphEvents,
  GraphBeforeEvents,
  SyncHandler,
  AsyncHandler,
  NodePropType,
} from '@graph-giraffe/core';

/**
 * Built-in primitive type names. React primitives may be provided for any of
 * these or for custom types through the keyed `primitives` record.
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
 * A declarative primitive rendered by the React adapter. The same component
 * is committed visibly and in the hidden measurement root; `isMeasurement`
 * identifies the latter so layout-only rendering can disable effects or
 * interaction affordances without changing its geometry.
 */
export type NodePrimitiveComponent = ComponentType<NodeSkinProps>;

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
 * A node supplied from external (controlled) state. Positions are **world
 * coordinates** (React Flow convention) — children are converted to local
 * coordinates relative to their parent before being applied.
 */
export interface ControlledNode {
  id: number;
  /** Node type name (built-in or registered custom type). */
  type: string;
  /** World position of the node. */
  position: { x: number; y: number };
  /** Parent node id, or null/undefined for root nodes. */
  parentId?: number | null;
  /** Display label. Defaults to `Node {id}`. */
  label?: string;
  /**
   * Required bounds — the DOM view is a pure mirror of the underlying WebGL
   * primitive, so the consumer owns the size. Props never auto-size a node:
   * a DOM view taller than the primitive's bounds breaks picking/dragging on
   * the overflowing portion.
   */
  width: number;
  height: number;
  /** When true, the node cannot be dragged (core lock semantics). */
  locked?: boolean;
  /**
   * Dynamic properties dictating node body height and overlay text — the same
   * shape as the core's `NodeData.props`, exposed to skin components as
   * `ctx.node.props`. The consumer remains responsible for sizing.
   */
  props?: NodePropType;
}

/**
 * An edge supplied from external (controlled) state.
 */
export interface ControlledEdge {
  id: number;
  source: number;
  target: number;
  sourceHandle?: HandleSide;
  targetHandle?: HandleSide;
}

/** Position change reported after an editor-originated drag. */
export interface NodePositionChange {
  id: number;
  position: { x: number; y: number };
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
  /** Runtime lower zoom bound; set equal to maxZoom to lock zoom. */
  minZoom?: number;
  /** Runtime upper zoom bound; set equal to minZoom to lock zoom. */
  maxZoom?: number;
  /** Texture skins to register on initialisation. */
  textureSkins?: AddUploadedTextureParams[];
  /** Enable verbose event logging to the console. */
  debug?: boolean;
  /** Primitive descriptors registered before the editor begins rendering. */
  primitiveDescriptors?: NodeTypeDescriptor[];

  /**
   * Rendering pipeline for node bodies: `"webgl"` (default, GPU) or `"dom"`
   * (custom-element / React skins). In `"dom"` mode the wrapper replaces every
   * built-in type with its DOM descriptor — either the bundled DOM skins or a
   * React component provided via the skin props. WebGL picking, handles and
   * hit-testing remain authoritative in both modes.
   */
  renderMode?: 'webgl' | 'dom';

  // ── Declarative React primitives (require `renderMode: "dom"`) ──
  /**
   * Canonical declarative primitive map. Each component is used for visible
   * DOM rendering and synchronous intrinsic measurement.
   */
  primitives?: Partial<Record<BuiltinNodeType | string, NodePrimitiveComponent>>;
  /**
   * Legacy visible-skin map keyed by node type. It remains a compatibility
   * alias for `primitives` and overrides the convenience props below.
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

  // ── Controlled graph (external source of truth) ────────
  /**
   * Compatibility input for consumers that still own graph state. When
   * provided, the adapter projects these lists into core through its public
   * controlled-graph command. New integrations should prefer core-owned graph
   * state and event/command synchronization.
   *
   * Note: each controlled sync clears the editor's undo history (imports are a
   * fresh baseline).
   */
  nodes?: ControlledNode[];
  /** External edge list (same semantics as `nodes`). */
  edges?: ControlledEdge[];
  /**
   * Fired after the user drags nodes in the editor, with their new world
   * positions. The consumer can fold these into its external state; the
   * compatibility adapter suppresses the immediate position-only echo.
   */
  onNodePositionChange?: (
    changes: NodePositionChange[]
  ) => void;

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
  addEdge(params: CreateEdgeParams): Promise<EdgeData | null>;
  removeEdge(id: number): EdgeData | null;
  getEdges(): EdgeData[];

  // ── Editor operations ──────────────────────────────────
  setConnectionMode(mode: ConnectionMode): void;
  /** Configure runtime zoom bounds, including tool-specific zoom locking. */
  setZoomRange(minZoom: number, maxZoom: number): void;
  /** Read the active runtime zoom bounds. */
  getZoomRange(): { minZoom: number; maxZoom: number };

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
   * Immediately set the camera viewport. Zoom is clamped by the configured
   * runtime zoom range.
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
