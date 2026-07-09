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
} from "@graph-giraffe/core";

import { NodeEditorContext } from "../context/NodeEditorContext";
import type { NodeEditorProps, NodeEditorHandle } from "../types";

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

        if (propsRef.current.debug != null) {
          instance.debug = propsRef.current.debug;
        }

        instance.render();
        editorRef.current = instance;
        setEditor(instance);
      });

      return () => {
        cancelled = true;
        // Reset the core singleton so a future mount can re-create it.
        (CoreNodeEditor as any)._instance = null;
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

        addNode(x, y, label, type = "node") {
          const ed = editorRef.current;
          if (!ed) return undefined;
          const store = (ed as any).store;
          const theme = store.getTheme();
          return store.add(x, y, label, theme, type);
        },

        removeNode(id) {
          const ed = editorRef.current;
          if (!ed) return;
          const store = (ed as any).store;
          const edgeStore = (ed as any).edgeStore;
          edgeStore.removeEdgesForNode(id);
          store.remove(id);
        },

        getNode(id) {
          const ed = editorRef.current;
          if (!ed) return undefined;
          return (ed as any).store.get(id);
        },

        getNodes() {
          const ed = editorRef.current;
          if (!ed) return [];
          return (ed as any).store.visibleNodes();
        },

        addEdge(params) {
          const ed = editorRef.current;
          if (!ed) return null;
          return (ed as any).edgeStore.add(params);
        },

        removeEdge(id) {
          const ed = editorRef.current;
          if (!ed) return null;
          return (ed as any).edgeStore.remove(id);
        },

        getEdges() {
          const ed = editorRef.current;
          if (!ed) return [];
          return (ed as any).edgeStore.allEdges();
        },

        setConnectionMode(mode) {
          editorRef.current?.setConnectionMode(mode);
        },
      }),
      []
    );

    const contextValue = useMemo(() => ({ editor }), [editor]);

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
