import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { ReactElement } from "react";
import type {
  DomNodeRenderer,
  NodeTypeDescriptor,
  NodeTypeRegistry,
  PrimitiveMeasurementCleanup,
  PrimitiveMeasurementTemplate,
  PrimitiveMeasurementTemplateContext,
} from "@graph-giraffe/core";
import { registerDomNodeDescriptors } from "@graph-giraffe/core";
import type {
  BuiltinNodeType,
  NodeEditorProps,
  NodeSkinComponent,
} from "../types";

const BUILTIN_SKIN_PROPS: Array<[BuiltinNodeType, keyof NodeEditorProps]> = [
  ["node", "nodeSkin"],
  ["hub", "hubSkin"],
  ["branch", "branchSkin"],
  ["group", "groupSkin"],
  ["composition", "compositionSkin"],
  ["composition-child", "compositionChildSkin"],
  ["subgraph", "subgraphSkin"],
];

function resolveSkin(type: string, props: NodeEditorProps): NodeSkinComponent | undefined {
  const primitive = props.primitives?.[type as BuiltinNodeType];
  if (primitive) return primitive;
  const fromMap = props.skins?.[type as BuiltinNodeType];
  if (fromMap) return fromMap;
  const prop = BUILTIN_SKIN_PROPS.find(([builtin]) => builtin === type)?.[1];
  return prop ? (props[prop] as NodeSkinComponent | undefined) : undefined;
}

export function hasReactSkinProps(props: NodeEditorProps): boolean {
  return Boolean(
    (props.primitives && Object.keys(props.primitives).length > 0) ||
    (props.skins && Object.keys(props.skins).length > 0) ||
    BUILTIN_SKIN_PROPS.some(([, key]) => props[key] != null)
  );
}

function renderSkin(
  Component: NodeSkinComponent,
  ctx: Parameters<DomNodeRenderer["createView"]>[0],
  getWrapper: () => NodeEditorProps["skinWrapper"]
): ReactElement {
  const Wrapper = getWrapper();
  return Wrapper ? <Wrapper><Component {...ctx} /></Wrapper> : <Component {...ctx} />;
}

interface ReactMeasurementBridge {
  template: PrimitiveMeasurementTemplate;
  cleanup: PrimitiveMeasurementCleanup;
}

interface ReactMeasurementRoot {
  root: Root;
  disposed: boolean;
}

function renderMeasurementSkin(
  Component: NodeSkinComponent,
  ctx: PrimitiveMeasurementTemplateContext,
  element: HTMLElement,
  getWrapper: () => NodeEditorProps["skinWrapper"]
): ReactElement {
  return renderSkin(
    Component,
    {
      node: ctx.node,
      props: ctx.props,
      children: ctx.children,
      element,
      worldX: 0,
      worldY: 0,
      width: ctx.node.width,
      height: ctx.node.height,
      isCollapsed: ctx.isCollapsed,
      isSelected: false,
      isLocked: false,
      isDropTarget: false,
      isMeasurement: true,
    },
    getWrapper
  );
}

/**
 * Render the same declarative React primitive into the core's attached,
 * off-screen measurement host. The commit is queued outside the caller's
 * React lifecycle so controlled adapter effects never invoke flushSync while
 * React is already rendering. Visible roots remain concurrent.
 */
function createReactMeasurementBridge(
  Component: NodeSkinComponent,
  getWrapper: () => NodeEditorProps["skinWrapper"]
): ReactMeasurementBridge {
  const roots = new WeakMap<HTMLElement, ReactMeasurementRoot>();

  return {
    template(ctx) {
      const root = createRoot(ctx.element);
      const state: ReactMeasurementRoot = { root, disposed: false };
      roots.set(ctx.element, state);
      queueMicrotask(() => {
        if (state.disposed) return;
        flushSync(() => {
          root.render(renderMeasurementSkin(Component, ctx, ctx.element, getWrapper));
        });
      });
      return ctx.element;
    },
    cleanup(ctx) {
      const state = roots.get(ctx.element);
      roots.delete(ctx.element);
      if (!state) return;
      state.disposed = true;
      state.root.unmount();
    },
  };
}

export function createReactDomRenderer(
  Component: NodeSkinComponent,
  getWrapper: () => NodeEditorProps["skinWrapper"]
): DomNodeRenderer {
  return {
    createView(ctx) {
      const element = document.createElement("div");
      const root = createRoot(element);
      root.render(renderSkin(Component, ctx, getWrapper));
      (element as unknown as { __ggDomRoot?: Root }).__ggDomRoot = root;
      return element;
    },
    interactiveDescendants:
      'button, a, input, select, textarea, [role="button"], [data-gg-interactive]',
    updateView(ctx) {
      (ctx.element as unknown as { __ggDomRoot?: Root }).__ggDomRoot?.render(
        renderSkin(Component, ctx, getWrapper)
      );
    },
    destroyView(ctx) {
      const host = ctx.element as unknown as { __ggDomRoot?: Root };
      const root = host.__ggDomRoot;
      host.__ggDomRoot = undefined;
      if (root) queueMicrotask(() => root.unmount());
    },
  };
}

export function registerReactPrimitives(
  registry: NodeTypeRegistry,
  props: NodeEditorProps,
  getWrapper: () => NodeEditorProps["skinWrapper"]
): void {
  if (props.renderMode !== "dom") return;

  registerDomNodeDescriptors(registry);
  const descriptors = [...registry.getAll()];
  for (const descriptor of descriptors) {
    const skin = resolveSkin(descriptor.type, props);
    if (!skin) continue;

    // Subgraph bounds are derived from the core scene graph. Its React skin
    // remains declarative and frame-driven, but it must not create an
    // intrinsic measurement root that can compete with core enclosure math.
    const measurement = registry.getBoundsAuthority(descriptor.type) === "core"
      ? undefined
      : createReactMeasurementBridge(skin, getWrapper);
    registry.replace({
      ...descriptor,
      domRenderer: createReactDomRenderer(skin, getWrapper),
      measurementTemplate: measurement?.template,
      measurementCleanup: measurement?.cleanup,
    });
  }
}

export function registerCustomPrimitives(
  registry: NodeTypeRegistry,
  descriptors: NodeTypeDescriptor[] | undefined
): void {
  for (const descriptor of descriptors ?? []) {
    if (registry.has(descriptor.type)) registry.replace(descriptor);
    else registry.register(descriptor);
  }
}
