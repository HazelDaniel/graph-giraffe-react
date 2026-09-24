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
} from "@graph-giraffe/core";

import type {
  NodeEditorConfig,
  GraphEvents,
  GraphBeforeEvents,
  SyncHandler,
  AsyncHandler,
  NodeData,
} from "@graph-giraffe/core";

import { NodeEditorContext } from "../context/NodeEditorContext";
import type {
  NodeEditorProps,
  NodeEditorHandle,
} from "../types";
import {
  registerCustomPrimitives,
  registerReactPrimitives,
  hasReactSkinProps,
} from "../adapter/react-renderer";
import { useControlledGraph } from "../adapter/use-controlled-graph";

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
  ["onGeometryChange", "geometry:change"],
];

const BEFORE_EVENT_MAP: Array<
  [keyof NodeEditorProps, keyof GraphBeforeEvents]
> = [
  ["onBeforeConnect", "before:connect"],
  ["onBeforeNodeCreate", "before:nodeCreate"],
  ["onBeforeNodeDelete", "before:nodeDelete"],
  ["onBeforeNodeReparent", "before:nodeReparent"],
];

function getCoreNodes(editor: CoreNodeEditor): NodeData[] {
  return editor.getNodes();
}

function getCoreEdges(editor: CoreNodeEditor) {
  return editor.getEdges();
}

function getCoreWorldPosition(
  editor: CoreNodeEditor,
  id: number
): { x: number; y: number } | undefined {
  return editor.getNodeWorldPosition(id);
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
      if (propsRef.current.minZoom !== undefined) {
        config.minZoom = propsRef.current.minZoom;
      }
      if (propsRef.current.maxZoom !== undefined) {
        config.maxZoom = propsRef.current.maxZoom;
      }
      if (propsRef.current.renderMode) {
        config.renderMode = propsRef.current.renderMode;
      }

      const startEditor = (): void => {
        if (cancelled) return;
        const bounds = container.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
          requestAnimationFrame(startEditor);
          return;
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
        if (cancelled) {
          instance.dispose();
          CoreNodeEditor.release();
          return;
        }

        registerCustomPrimitives(
          instance.typeRegistry,
          propsRef.current.primitiveDescriptors
        );
        if (propsRef.current.renderMode === "dom") {
          registerReactPrimitives(
            instance.typeRegistry,
            propsRef.current,
            () => propsRef.current.skinWrapper
          );
        } else if (hasReactSkinProps(propsRef.current)) {
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
      };

      startEditor();

      return () => {
        cancelled = true;
        editorRef.current?.dispose();
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
      if (!editor || props.minZoom === undefined || props.maxZoom === undefined) return;
      editor.setZoomRange(props.minZoom, props.maxZoom);
    }, [editor, props.minZoom, props.maxZoom]);

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

        setZoomRange(minZoom, maxZoom) {
          editorRef.current?.setZoomRange(minZoom, maxZoom);
        },

        getZoomRange() {
          return editorRef.current?.getZoomRange() ?? { minZoom: 0.1, maxZoom: 5 };
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

    const graphVersion = useControlledGraph(
      editor,
      props.nodes,
      props.edges,
      props.onNodePositionChange
    );

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
