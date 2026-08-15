import { createContext, useContext, useEffect, useRef } from 'react';
import {
  NodeEditor,
  ViewportPortal,
  useViewport,
  useNodes,
  useEdges,
  useNodeEditor,
  useGraphEvent,
} from './index';
import type {
  NodeEditorHandle,
  NodeSkinProps,
  NodeSkinWrapper,
} from './types';

import './App.css';
import '@graph-giraffe/core/assets/index.css';

// ─── Provider-injection demo (skinWrapper) ───────────────
const DemoThemeContext = createContext<'dark' | 'light'>('dark');

const DemoThemeProvider: NodeSkinWrapper = ({ children }) => (
  <DemoThemeContext.Provider value="dark">{children}</DemoThemeContext.Provider>
);

function MyNodeSkin({ node, isSelected, isLocked }: NodeSkinProps) {
  const theme = useContext(DemoThemeContext);
  return (
    <div
      style={{
        width: node.width,
        height: node.height,
        background: isSelected ? '#7c3aed' : '#1e293b',
        border: `2px solid ${theme === 'dark' ? '#475569' : '#cbd5e1'}`,
        borderRadius: 8,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontFamily: 'monospace',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    >
      {node.text}
      {isLocked ? ' 🔒' : ''}
    </div>
  );
}

// ─── HUD: viewport + graph state readouts ────────────────
function HUD({ handle }: { handle: React.RefObject<NodeEditorHandle | null> }) {
  const { x, y, zoom } = useViewport();
  const nodes = useNodes();
  const edges = useEdges();
  const editor = useNodeEditor();

  return (
    <div className="hud">
      <div>
        viewport {x.toFixed(0)},{y.toFixed(0)} @ {zoom.toFixed(2)}
      </div>
      <div>
        nodes {nodes.length} · edges {edges.length}
      </div>
      <button
        onClick={() => {
          void editor?.panTo(0, 0, { zoom: 1 });
        }}
      >
        pan home
      </button>
      <button
        onClick={() => {
          void handle.current?.addNode(200, 120, `node-${Date.now() % 1000}`);
        }}
      >
        add node
      </button>
    </div>
  );
}

// ─── World-space overlay via ViewportPortal ──────────────
function OverlayDemo() {
  const { zoom } = useViewport();
  return (
    <ViewportPortal>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(124, 58, 237, 0.7)',
          border: '2px solid #a78bfa',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 10,
          pointerEvents: 'none',
        }}
        title="world (0,0)"
      >
        {zoom.toFixed(1)}
      </div>
    </ViewportPortal>
  );
}

// ─── Seed a few nodes once the editor is ready ─────────
function SeedNodes({ handle }: { handle: React.RefObject<NodeEditorHandle | null> }) {
  // Children only mount once the editor is initialised, so this runs once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const alpha = await handle.current?.addNode(80, 120, 'alpha');
      const beta = await handle.current?.addNode(360, 200, 'beta');
      await handle.current?.addNode(640, 120, 'gamma');
      if (cancelled || !alpha || !beta) return;
      handle.current?.addEdge({
        sourceNodeId: alpha.id,
        sourceHandleSide: 'right',
        targetNodeId: beta.id,
        targetHandleSide: 'left',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);
  return null;
}

function EventLogger() {
  useGraphEvent('connect', (payload) => {
    console.log('[demo] connect', payload);
  });
  useGraphEvent('node:click', (payload) => {
    console.log('[demo] node:click', payload.nodeId);
  });
  return null;
}

export default function App() {
  const editorRef = useRef<NodeEditorHandle>(null);

  return (
    <div className="app-root">
      <NodeEditor
        ref={editorRef}
        connectionMode="node"
        debug
        renderMode="dom"
        skins={{ node: MyNodeSkin }}
        skinWrapper={DemoThemeProvider}
        style={{ width: '100vw', height: '100vh' }}
      >
        <EventLogger />
        <SeedNodes handle={editorRef} />
        <HUD handle={editorRef} />
        <OverlayDemo />
      </NodeEditor>
    </div>
  );
}
