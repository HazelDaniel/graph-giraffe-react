import { useRef, useCallback } from 'react';
import { NodeEditor } from './components/NodeEditor';
import { useGraphEvent } from './hooks/useGraphEvent';
import type { NodeEditorHandle } from './types';

import './App.css';

/** Child component that uses the hooks inside NodeEditor context. */
function EventLogger() {
  useGraphEvent('connect', (payload) => {
    console.log('[demo] connect', payload);
  });

  useGraphEvent('node:click', (payload) => {
    console.log('[demo] node:click', payload.nodeId);
  });

  useGraphEvent('node:labelChange', (payload) => {
    console.log('[demo] label changed', payload.nodeId, payload.newLabel);
  });

  return null;
}

function App() {
  const editorRef = useRef<NodeEditorHandle>(null);

  const handleConnect = useCallback(
    (payload: { sourceId: number; targetId: number; edgeId: number }) => {
      console.log(
        `Connected #${payload.sourceId} → #${payload.targetId} (edge ${payload.edgeId})`,
      );
    },
    [],
  );

  return (
    <div className="app-root">
      <NodeEditor
        ref={editorRef}
        connectionMode="node"
        debug
        onConnect={handleConnect}
        style={{ width: '100vw', height: '100vh' }}
      >
        <EventLogger />
      </NodeEditor>
    </div>
  );
}

export default App;
