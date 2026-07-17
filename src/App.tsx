// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { RoutineEditor } from './components/RoutineEditor/RoutineEditor';
import { PlancheView } from './components/PlancheView/PlancheView';
import { CommunicationEditor } from './components/CommunicationEditor/CommunicationEditor';
import { CommunicationView } from './components/CommunicationView/CommunicationView';
import { CommunicationDefaults } from './components/CommunicationDefaults';

type View =
  | { name: 'dashboard' }
  | { name: 'editor' }
  | { name: 'viewer'; routineId: string }
  | { name: 'communication-editor'; boardId: string }
  | { name: 'communication-viewer'; boardId: string }
  | { name: 'communication-defaults' };

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'dashboard' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!session) return <Auth />;

  if (view.name === 'editor') {
    return (
      <RoutineEditor
        onDone={(routineId) => setView({ name: 'viewer', routineId })}
        onCancel={() => setView({ name: 'dashboard' })}
      />
    );
  }

  if (view.name === 'viewer') {
    return <PlancheView routineId={view.routineId} onBack={() => setView({ name: 'dashboard' })} />;
  }

  if (view.name === 'communication-editor') {
    return (
      <CommunicationEditor
        boardId={view.boardId}
        onOpenViewer={(boardId) => setView({ name: 'communication-viewer', boardId })}
        onBack={() => setView({ name: 'dashboard' })}
      />
    );
  }

  if (view.name === 'communication-viewer') {
    return <CommunicationView boardId={view.boardId} onBack={() => setView({ name: 'dashboard' })} />;
  }

  if (view.name === 'communication-defaults') {
    return <CommunicationDefaults onBack={() => setView({ name: 'dashboard' })} />;
  }

  return (
    <Dashboard
      onCreateNew={() => setView({ name: 'editor' })}
      onOpenRoutine={(routineId) => setView({ name: 'viewer', routineId })}
      onOpenCommunication={(boardId) => setView({ name: 'communication-editor', boardId })}
      onOpenCommunicationDefaults={() => setView({ name: 'communication-defaults' })}
    />
  );
}

export default App;
