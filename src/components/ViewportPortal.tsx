import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNodeEditor } from '../hooks/useNodeEditor';
import type { CSSProperties, ReactNode } from 'react';

export interface ViewportPortalProps {
  /** React content rendered in viewport (world) space. */
  children?: ReactNode;
  /** CSS class applied to the portal wrapper div. */
  className?: string;
  /** Inline styles applied to the portal wrapper div. */
  style?: CSSProperties;
}

const OVERLAY_CONTAINER_ID = 'gg-overlays-scaling';

/**
 * Renders React content into the editor's world-space overlay container.
 *
 * Children are positioned in **world coordinates** (e.g. `left: node.x`,
 * `top: node.y`) — the editor's camera transform (pan + zoom) is applied to
 * the container itself, so overlays track the viewport automatically, exactly
 * like React Flow's `<ViewportPortal>`.
 *
 * Children that need screen-space derived values (e.g. a label that should
 * stay a fixed pixel size) should read {@link useViewport} and compensate for
 * `zoom` themselves.
 *
 * Must be rendered inside a `<NodeEditor>` tree (after the editor has
 * initialised; returns `null` until then).
 *
 * @example
 * ```tsx
 * <ViewportPortal>
 *   <div style={{ left: nodeX, top: nodeY }} className="cursor-marker" />
 * </ViewportPortal>
 * ```
 */
export function ViewportPortal({
  children,
  className,
  style,
}: ViewportPortalProps) {
  const editor = useNodeEditor();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!editor) return;
    const el = document.getElementById(OVERLAY_CONTAINER_ID);
    setContainer(el);
    return () => {
      setContainer(null);
    };
  }, [editor]);

  if (!container) return null;

  return createPortal(
    <div className={className} style={style}>
      {children}
    </div>,
    container
  );
}
