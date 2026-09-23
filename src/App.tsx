import { createContext, useContext, useState } from 'react';
import {
  NodeEditor,
  ViewportPortal,
  useViewport,
  useGraphEvent,
} from './index';
import type {
  ControlledNode,
  ControlledEdge,
  NodeSkinProps,
  NodeSkinWrapper,
  NodePositionChange,
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
  // External source of truth, like Redux in a real app.
  const [graph, setGraph] = useState<{
    nodes: ControlledNode[];
    edges: ControlledEdge[];
  }>({
    nodes: [],
    edges: [],
  });

  const handlePositionChange = (changes: NodePositionChange[]) => {
    // Consumer folds editor-originated drags into its state. The wrapper
    // suppresses the echo, so this never re-imports.
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        const change = changes.find((c) => c.id === n.id);
        return change ? { ...n, position: change.position } : n;
      }),
    }));
  };

  return (
    <div className="app-root">
      <NodeEditor
        connectionMode="node"
        debug
        renderMode="dom"
        primitives={{ node: MyNodeSkin }}
        skinWrapper={DemoThemeProvider}
        nodes={graph.nodes}
        edges={graph.edges}
        onNodePositionChange={handlePositionChange}
        style={{ width: '100vw', height: '100vh' }}
      >
        <EventLogger />
        <OverlayDemo />
      </NodeEditor>
    </div>
  );
}
