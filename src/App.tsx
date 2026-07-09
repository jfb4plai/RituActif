import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { RoutineEditor } from './components/RoutineEditor/RoutineEditor';
import { PlancheView } from './components/PlancheView/PlancheView';

type View = { name: 'dashboard' } | { name: 'editor' } | { name: 'viewer'; routineId: string };

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

  return (
    <Dashboard
      onCreateNew={() => setView({ name: 'editor' })}
      onOpenRoutine={(routineId) => setView({ name: 'viewer', routineId })}
    />
  );
}

export default App;
