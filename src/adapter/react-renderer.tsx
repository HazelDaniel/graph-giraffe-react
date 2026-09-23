import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { ReactElement } from "react";
import type {
  DomNodeRenderer,
  NodeTypeDescriptor,
  NodeTypeRegistry,
  PrimitiveMeasurementTemplate,
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
  const fromMap = props.skins?.[type as BuiltinNodeType];
  if (fromMap) return fromMap;
  const prop = BUILTIN_SKIN_PROPS.find(([builtin]) => builtin === type)?.[1];
  return prop ? (props[prop] as NodeSkinComponent | undefined) : undefined;
}

export function hasReactSkinProps(props: NodeEditorProps): boolean {
  return Boolean(
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

export function createReactMeasurementTemplate(
  template: PrimitiveMeasurementTemplate
): PrimitiveMeasurementTemplate {
  return template;
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
    const measurementTemplate = props.measurementTemplates?.[descriptor.type];
    if (!skin && !measurementTemplate) continue;

    registry.replace({
      ...descriptor,
      ...(skin ? { domRenderer: createReactDomRenderer(skin, getWrapper) } : {}),
      ...(measurementTemplate ? { measurementTemplate } : {}),
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
