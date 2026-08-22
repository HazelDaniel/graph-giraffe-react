import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NodeEditor as CoreNodeEditor,
  Shell,
  shaders,
  DOM_NODE_DESCRIPTORS,
  registerDomNodeDescriptors,
} from "@graph-giraffe/core";

import { createRoot } from "react-dom/client";

import type {
  NodeEditorConfig,
  NodeTypeRegistry,
  DomNodeRenderer,
  GraphEvents,
  GraphBeforeEvents,
  SyncHandler,
  AsyncHandler,
  NodeData,
} from "@graph-giraffe/core";

import type {
  ControlledNode,
  ControlledEdge,
  NodePositionChange,
} from "../types";

import type { Root } from "react-dom/client";

import { NodeEditorContext } from "../context/NodeEditorContext";
import type {
  NodeEditorProps,
  NodeEditorHandle,
  NodeSkinComponent,
  BuiltinNodeType,
} from "../types";

import "../styles/core-styles.css";

const SYNC_EVENT_MAP: Array<[keyof NodeEditorProps, keyof GraphEvents]> = [
  ["onConnect", "connect"],
  ["onNodeClick", "node:click"],
  ["onNodeDragStart", "node:dragStart"],
  ["onNodeDrag", "node:drag"],
  ["onNodeDragStop", "node:dragStop"],
  ["onEdgeClick", "edge:click"],
  ["onPaneClick", "pane:click"],
  ["onNodeLabelChange", "node:labelChange"],
  ["onNodePropChange", "node:propChange"],
  ["onNodeReparent", "node:reparent"],
  ["onSelectionChange", "selection:change"],
  ["onSubgraphCollapseToggle", "subgraph:collapseToggle"],
  ["onHubCreated", "hub:created"],
];

const BEFORE_EVENT_MAP: Array<
  [keyof NodeEditorProps, keyof GraphBeforeEvents]
> = [
  ["onBeforeConnect", "before:connect"],
  ["onBeforeNodeCreate", "before:nodeCreate"],
  ["onBeforeNodeDelete", "before:nodeDelete"],
  ["onBeforeNodeReparent", "before:nodeReparent"],
];

// Convenience prop name per built-in node type, so `groupSkin={<MyGroup/>}`
// works alongside the generic `skins={{ group: MyGroup }}` record.
const BUILTIN_SKIN_PROPS: Array<[BuiltinNodeType, keyof NodeEditorProps]> = [
  ["node", "nodeSkin"],
  ["hub", "hubSkin"],
  ["branch", "branchSkin"],
  ["group", "groupSkin"],
  ["composition", "compositionSkin"],
  ["composition-child", "compositionChildSkin"],
  ["subgraph", "subgraphSkin"],
];

function resolveSkin(
  type: string,
  props: NodeEditorProps
): NodeSkinComponent | undefined {
  const viaRecord = props.skins?.[type as BuiltinNodeType];
  if (viaRecord) return viaRecord;
  for (const [builtin, propKey] of BUILTIN_SKIN_PROPS) {
    if (type === builtin) {
      return (props as Record<string, unknown>)[propKey] as
        | NodeSkinComponent
        | undefined;
    }
  }
  return undefined;
}

function hasSkins(props: NodeEditorProps): boolean {
  return (
    (props.skins && Object.keys(props.skins).length > 0) ||
    BUILTIN_SKIN_PROPS.some(([, propKey]) => props[propKey] != null)
  );
}

/**
 * Resolve the skin content for a node view, wrapped in the consumer's
 * `skinWrapper` provider when one is supplied. The wrapper is resolved
 * lazily via `getWrapper` so it always reflects the latest render.
 */
function renderSkinContent(
  Component: NodeSkinComponent,
  ctx: Parameters<DomNodeRenderer["createView"]>[0],
  getWrapper: () => NodeEditorProps["skinWrapper"]
): React.ReactElement {
  const Wrapper = getWrapper();
  if (Wrapper) {
    return (
      <Wrapper>
        <Component {...ctx} />
      </Wrapper>
    );
  }
  return <Component {...ctx} />;
}

function createReactDomRenderer(
  Component: NodeSkinComponent,
  getWrapper: () => NodeEditorProps["skinWrapper"]
): DomNodeRenderer {
  return {
    createView(ctx) {
      const element = document.createElement("div");
      const root = createRoot(element);
      root.render(renderSkinContent(Component, ctx, getWrapper));
      (element as unknown as { __ggDomRoot?: Root }).__ggDomRoot = root;
      return element;
    },
    updateView(ctx) {
      const host = ctx.element as unknown as { __ggDomRoot?: Root };
      host.__ggDomRoot?.render(renderSkinContent(Component, ctx, getWrapper));
    },
    destroyView(ctx) {
      const host = ctx.element as unknown as { __ggDomRoot?: Root };
      host.__ggDomRoot?.unmount();
      (host as unknown as { __ggDomRoot?: Root }).__ggDomRoot = undefined;
    },
  };
}

/**
 * Replace every built-in descriptor with its DOM skin on the editor's registry.
 * Types without a consumer skin fall back to the bundled DOM skins shipped in
 * core, so `renderMode: "dom"` works with zero configuration.
 */
interface CoreStoreLike {
  get(id: number): NodeData | undefined;
  allNodesMap: Map<number, NodeData>;
}

/**
 * World position of a node: sum of local positions up the parent chain.
 */
function worldPositionOf(
  store: CoreStoreLike,
  id: number
): { x: number; y: number } | undefined {
  const node = store.get(id);
  if (!node) return undefined;
  let x = node.localX;
  let y = node.localY;
  let parentId = node.parentId;
  while (parentId !== null) {
    const parent = store.get(parentId);
    if (!parent) break;
    x += parent.localX;
    y += parent.localY;
    parentId = parent.parentId;
  }
  return { x, y };
}

/**
 * Rebuild the editor's graph from external controlled state. Preserves editor
 * metadata (theme, camera, textures) by starting from `exportGraph()` and only
 * swapping the node/edge lists. Import resets selection + undo history.
 */
function applyControlledGraph(
  ed: CoreNodeEditor,
  nodes: ControlledNode[],
  edges: ControlledEdge[]
): void {
  const snapshot = ed.exportGraph();

  // Build world positions from the incoming array itself. The editor store is
  // NOT a reliable source: on first import it is empty, and on re-import it
  // holds the previous graph (stale positions). `ControlledNode.position` is
  // documented as a world coordinate, so the incoming array is authoritative.
  const worldByNodeId = new Map<number, { x: number; y: number }>();
  for (const n of nodes) {
    worldByNodeId.set(n.id, n.position);
  }

  snapshot.nodes = nodes.map((n) => {
    const parentWorld =
      n.parentId != null ? worldByNodeId.get(n.parentId) : undefined;
    return {
      id: n.id,
      nodeType: n.type,
      localX: parentWorld ? n.position.x - parentWorld.x : n.position.x,
      localY: parentWorld ? n.position.y - parentWorld.y : n.position.y,
      width: n.width ?? 160,
      height: n.height ?? 48,
      text: n.label ?? `Node ${n.id}`,
      textureIds: { body: "", head: "" },
      parentId: n.parentId ?? null,
      childIds: [],
      compositionRefId: null,
      isLocked: n.locked ?? false,
    } satisfies SerializedNode;
  });

  snapshot.edges = edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    sourceHandleSide: e.sourceHandle ?? "right",
    targetNodeId: e.target,
    targetHandleSide: e.targetHandle ?? "left",
    edgeType: "cubic",
    headType: "arrow",
    headSkinId: "arrow",
    label: "",
  }) satisfies SerializedEdge);

  snapshot.counters = {
    nodeId: nodes.reduce((max, n) => Math.max(max, n.id), 0),
    edgeId: edges.reduce((max, e) => Math.max(max, e.id), 0),
  };

  ed.importGraph(snapshot);
}

/**
 * Import external state when it differs from the last-applied fingerprint.
 * `fingerprintRef` short-circuits echo loops (editor → callback → props → here).
 */
function syncControlledGraph(
  ed: CoreNodeEditor,
  nodes: ControlledNode[],
  edges: ControlledEdge[],
  fingerprintRef: { current: string | null }
): void {
  const fingerprint = JSON.stringify([nodes, edges]);
  if (fingerprintRef.current === fingerprint) return;
  applyControlledGraph(ed, nodes, edges);
  fingerprintRef.current = fingerprint;
}

function applySkins(
  registry: NodeTypeRegistry,
  props: NodeEditorProps,
  getWrapper: () => NodeEditorProps["skinWrapper"]
): void {
  if (!hasSkins(props)) {
    registerDomNodeDescriptors(registry);
    return;
  }
  for (const descriptor of DOM_NODE_DESCRIPTORS) {
    const Skin = resolveSkin(descriptor.type, props);
    registry.replace(
      Skin
        ? {
            ...descriptor,
            domRenderer: createReactDomRenderer(Skin, getWrapper),
          }
        : descriptor
    );
  }
}

/**
 * React wrapper around `@graph-giraffe/core`.
 *
 * Renders the full WebGL editor into a container `<div>`.
 * Expose an imperative handle via `ref` for programmatic graph
 * manipulation. Child hooks can access the editor via context.
 *
 * @example
 * ```tsx
 * const editorRef = useRef<NodeEditorHandle>(null);
 *
 * <NodeEditor
 *   ref={editorRef}
 *   connectionMode="node"
 *   onConnect={(e) => console.log('connected', e)}
 * />
 * ```
 */
export const NodeEditor = forwardRef<NodeEditorHandle, NodeEditorProps>(
  function NodeEditor(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<CoreNodeEditor | null>(null);

    // Keep a mutable ref so imperative handle always sees latest instance
    // without needing the handle to re-create on every state change.
    const editorRef = useRef<CoreNodeEditor | null>(null);

    // Refs for the latest callback values so event subscriptions
    // don't need to re-bind on every render.
    const propsRef = useRef(props);
    propsRef.current = props;

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = Shell;

      let cancelled = false;

      const config: NodeEditorConfig = {};
      if (propsRef.current.connectionMode) {
        config.connectionMode = propsRef.current.connectionMode;
      }
      if (propsRef.current.handleStyle) {
        config.handleStyle = propsRef.current.handleStyle;
      }
      if (propsRef.current.assetsPath) {
        config.assetsPath = propsRef.current.assetsPath;
      }
      if (propsRef.current.renderMode) {
        config.renderMode = propsRef.current.renderMode;
      }

      CoreNodeEditor.create(
        "webgl-canvas",
        "2d-bg-canvas",
        shaders.vertexShader,
        shaders.fragmentShader,
        shaders.bgVertexShader,
        shaders.bgFragmentShader,
        shaders.msdfVertexShader,
        shaders.msdfFragmentShader,
        shaders.iconBGVertexShader,
        shaders.iconBGFragmentShader,
        config,
        propsRef.current.textureSkins ?? []
      ).then((instance) => {
        if (cancelled) return;

        if (propsRef.current.renderMode === "dom") {
          // Replace built-ins with their DOM skins (bundled, or React-component
          // skins from props). Single call covers the no-skin default too.
          applySkins(
            instance.typeRegistry,
            propsRef.current,
            () => propsRef.current.skinWrapper
          );
        } else if (hasSkins(propsRef.current)) {
          throw new Error(
            '@graph-giraffe/react: skin props require `renderMode="dom"`.'
          );
        }

        if (propsRef.current.debug != null) {
          instance.debug = propsRef.current.debug;
        }

        instance.render();
        editorRef.current = instance;
        setEditor(instance);
      });

      return () => {
        cancelled = true;
        // Release the core singleton before removing the host DOM.
        CoreNodeEditor.release();
        editorRef.current = null;
        setEditor(null);
        if (container) container.innerHTML = "";
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (editor && props.debug != null) {
        editor.debug = props.debug;
      }
    }, [editor, props.debug]);

    useEffect(() => {
      if (editor && props.connectionMode) {
        editor.setConnectionMode(props.connectionMode);
      }
    }, [editor, props.connectionMode]);

    useEffect(() => {
      if (!editor) return;

      const unsubscribers: Array<() => void> = [];

      for (const [propKey, eventKey] of SYNC_EVENT_MAP) {
        const wrappedHandler: SyncHandler<any> = (payload) => {
          const handler = propsRef.current[propKey] as
            | SyncHandler<any>
            | undefined;
          handler?.(payload);
        };
        unsubscribers.push(editor.events.on(eventKey, wrappedHandler));
      }

      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [editor]);

    useEffect(() => {
      if (!editor) return;

      const unsubscribers: Array<() => void> = [];

      for (const [propKey, eventKey] of BEFORE_EVENT_MAP) {
        const wrappedHandler: AsyncHandler<any> = (payload) => {
          const handler = propsRef.current[propKey] as
            | AsyncHandler<any>
            | undefined;
          if (!handler) return true;
          return handler(payload);
        };
        unsubscribers.push(editor.events.onBefore(eventKey, wrappedHandler));
      }

      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    }, [editor]);

    useImperativeHandle(
      ref,
      () => ({
        get editor() {
          return editorRef.current;
        },

        async addNode(x, y, label, type = "node") {
          const ed = editorRef.current;
          if (!ed) return null;
          // Route through the editor's command-based path so the action is
          // undoable and DOM views remain synchronized by core.
          return ed.addNode(type, x, y, null, label);
        },

        removeNode(id) {
          const ed = editorRef.current;
          if (!ed) return;
          void ed.removeNode(id);
        },

        getNode(id) {
          const ed = editorRef.current;
          if (!ed) return undefined;
          return getCoreNodes(ed).find((node) => node.id === id);
        },

        getNodes() {
          const ed = editorRef.current;
          if (!ed) return [];
          return getCoreNodes(ed);
        },

        addEdge(params) {
          const ed = editorRef.current;
          if (!ed) return null;
          return ed.addEdge(params);
        },

        removeEdge(id) {
          const ed = editorRef.current;
          if (!ed) return null;
          return ed.removeEdge(id);
        },

        getEdges() {
          const ed = editorRef.current;
          if (!ed) return [];
          return getCoreEdges(ed);
        },

        setConnectionMode(mode) {
          editorRef.current?.setConnectionMode(mode);
        },

        screenToWorld(screenX, screenY) {
          const ed = editorRef.current;
          if (!ed) return { x: 0, y: 0 };
          return ed.screenToWorld(screenX, screenY);
        },

        worldToScreen(worldX, worldY) {
          const ed = editorRef.current;
          if (!ed) return { x: 0, y: 0 };
          return ed.worldToScreen(worldX, worldY);
        },

        getViewport() {
          const ed = editorRef.current;
          if (!ed) return { x: 0, y: 0, zoom: 1 };
          const { panX, panY, zoom } = ed.getCameraState();
          return { x: panX, y: panY, zoom };
        },

        setViewport(x, y, zoom) {
          const ed = editorRef.current;
          if (!ed) return;
          ed.setViewport(x, y, zoom);
        },

        panTo(worldX, worldY, options) {
          const ed = editorRef.current;
          if (!ed) return Promise.resolve();
          return ed.panTo(worldX, worldY, options);
        },

        getNodeWorldPosition(id) {
          const ed = editorRef.current;
          if (!ed) return undefined;
          return getCoreWorldPosition(ed, id);
        },

        getNodeScreenPosition(id) {
          const ed = editorRef.current;
          if (!ed) return undefined;
          const world = getCoreWorldPosition(ed, id);
          if (!world) return undefined;
          return ed.worldToScreen(world.x, world.y);
        },
      }),
      []
    );

    // ── Controlled graph sync ────────────────────────────
    const [graphVersion, setGraphVersion] = useState(0);
    const controlledFingerprintRef = useRef<string | null>(null);
    const draggingRef = useRef(false);
    const pendingControlledSyncRef = useRef(false);

    // Reconcile external `nodes`/`edges` props into the editor. Skipped while
    // the user is mid-drag; a pending sync runs after `node:dragStop`.
    useEffect(() => {
      const ed = editorRef.current;
      const { nodes, edges } = propsRef.current;
      if (!ed || !nodes || !edges) return;
      if (draggingRef.current) {
        pendingControlledSyncRef.current = true;
        return;
      }
      const before = controlledFingerprintRef.current;
      syncControlledGraph(ed, nodes, edges, controlledFingerprintRef);
      if (controlledFingerprintRef.current !== before) {
        setGraphVersion((v) => v + 1);
      }
    }, [editor, props.nodes, props.edges]);

    // Report editor-originated drags back to the consumer and keep the
    // fingerprint in sync so the echo doesn't re-import.
    useEffect(() => {
      const ed = editorRef.current;
      if (!ed) return;

      const onDragStart = (): void => {
        draggingRef.current = true;
      };

      const onDragStop = (payload: GraphEvents["node:dragStop"]): void => {
        draggingRef.current = false;

        const callback = propsRef.current.onNodePositionChange;
        if (callback && payload.nodeIds.length > 0) {
          const changes: NodePositionChange[] = [];
          for (const id of payload.nodeIds) {
            const position = getCoreWorldPosition(ed, id);
            if (position) changes.push({ id, position });
          }
          if (changes.length > 0) callback(changes);
        }

        // Fold the editor's current positions into the fingerprint so the
        // consumer's echo of the drag doesn't trigger a re-import.
        const { nodes, edges } = propsRef.current;
        if (nodes && edges) {
          const syncedNodes = nodes.map((n) => {
            const position = getCoreWorldPosition(ed, n.id);
            return position ? { ...n, position } : n;
          });
          controlledFingerprintRef.current = JSON.stringify([
            syncedNodes,
            edges,
          ]);
        }

        if (pendingControlledSyncRef.current) {
          pendingControlledSyncRef.current = false;
          const { nodes: nextNodes, edges: nextEdges } = propsRef.current;
          if (nextNodes && nextEdges) {
            const before = controlledFingerprintRef.current;
            syncControlledGraph(
              ed,
              nextNodes,
              nextEdges,
              controlledFingerprintRef
            );
            if (controlledFingerprintRef.current !== before) {
              setGraphVersion((v) => v + 1);
            }
          }
        }
      };

      const offDragStart = ed.events.on("node:dragStart", onDragStart);
      const offDragStop = ed.events.on("node:dragStop", onDragStop);
      return () => {
        offDragStart();
        offDragStop();
      };
    }, [editor]);

    const contextValue = useMemo(
      () => ({ editor, graphVersion }),
      [editor, graphVersion]
    );

    return (
      <NodeEditorContext.Provider value={contextValue}>
        <div
          ref={containerRef}
          className={`gg-editor-root${
            props.className ? ` ${props.className}` : ""
          }`}
          style={{
            width: "100%",
            height: "100%",
            ...props.style,
          }}
        />
        {editor && props.children}
      </NodeEditorContext.Provider>
    );
  }
);
