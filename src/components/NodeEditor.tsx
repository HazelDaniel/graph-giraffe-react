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
} from "@graph-giraffe/core";

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
 * Bridge a declarative React skin component to core's `DomNodeRenderer`. Each
 * view mounts a React root hosting the component; state changes flow through
 * `updateView` re-renders and teardown unmounts the root.
 */
function createReactDomRenderer(
  Component: NodeSkinComponent
): DomNodeRenderer {
  return {
    createView(ctx) {
      const element = document.createElement("div");
      const root = createRoot(element);
      root.render(<Component {...ctx} />);
      (element as unknown as { __ggDomRoot?: Root }).__ggDomRoot = root;
      return element;
    },
    updateView(ctx) {
      const host = ctx.element as unknown as { __ggDomRoot?: Root };
      host.__ggDomRoot?.render(<Component {...ctx} />);
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
function applySkins(registry: NodeTypeRegistry, props: NodeEditorProps): void {
  if (!hasSkins(props)) {
    registerDomNodeDescriptors(registry);
    return;
  }
  for (const descriptor of DOM_NODE_DESCRIPTORS) {
    const Skin = resolveSkin(descriptor.type, props);
    registry.replace(
      Skin
        ? { ...descriptor, domRenderer: createReactDomRenderer(Skin) }
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
          applySkins(instance.typeRegistry, propsRef.current);
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
