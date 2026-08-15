import { createContext, useContext, useRef, useState } from 'react';
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
  ControlledNode,
  ControlledEdge,
  NodeEditorHandle,
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

// ─── HUD: viewport + graph state readouts ────────────────
function HUD({
  onAddNode,
  onRemoteMove,
  onRemoteAdd,
}: {
  onAddNode: () => void;
  onRemoteMove: () => void;
  onRemoteAdd: () => void;
}) {
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
      <button onClick={onAddNode}>add node</button>
      <button onClick={onRemoteMove}>remote move #1</button>
      <button onClick={onRemoteAdd}>remote add</button>
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

let nextId = 4;

export default function App() {
  const editorRef = useRef<NodeEditorHandle>(null);

  // External source of truth, like Redux in a real app.
  const [graph, setGraph] = useState<{
    nodes: ControlledNode[];
    edges: ControlledEdge[];
  }>({
    nodes: [
      { id: 1, type: 'node', position: { x: 80, y: 120 }, label: 'alpha' },
      { id: 2, type: 'node', position: { x: 360, y: 200 }, label: 'beta' },
      { id: 3, type: 'node', position: { x: 640, y: 120 }, label: 'gamma' },
    ],
    edges: [{ id: 1, source: 1, target: 2 }],
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
        ref={editorRef}
        connectionMode="node"
        debug
        renderMode="dom"
        skins={{ node: MyNodeSkin }}
        skinWrapper={DemoThemeProvider}
        nodes={graph.nodes}
        edges={graph.edges}
        onNodePositionChange={handlePositionChange}
        style={{ width: '100vw', height: '100vh' }}
      >
        <EventLogger />
        <HUD
          onAddNode={() =>
            setGraph((g) => ({
              ...g,
              nodes: [
                ...g.nodes,
                {
                  id: nextId++,
                  type: 'node',
                  position: { x: 200 + Math.random() * 300, y: 300 },
                  label: `node-${nextId - 1}`,
                },
              ],
            }))
          }
          onRemoteMove={() =>
            setGraph((g) => ({
              ...g,
              nodes: g.nodes.map((n) =>
                n.id === 1 ? { ...n, position: { x: 480, y: 60 } } : n
              ),
            }))
          }
          onRemoteAdd={() =>
            setGraph((g) => ({
              ...g,
              nodes: [
                ...g.nodes,
                {
                  id: nextId++,
                  type: 'node',
                  position: { x: 900, y: 260 },
                  label: `remote-${nextId - 1}`,
                },
              ],
            }))
          }
        />
        <OverlayDemo />
      </NodeEditor>
    </div>
  );
}
