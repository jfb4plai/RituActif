import type { Routine, RoutineStep } from '../../lib/types';
import { resolveTextVisible } from '../../lib/textVisibility';
import { computeGridCells } from '../../lib/gridLayout';
import { speak } from '../../lib/tts';

interface GridViewProps {
  routine: Routine;
  steps: RoutineStep[];
}

export function GridView({ routine, steps }: GridViewProps) {
  const config = routine.config_grille;
  if (!config) return <p>Configuration de grille manquante.</p>;

  const cells = computeGridCells(config.rows, config.cols);
  const stepsByPosition = new Map(steps.map((s) => [s.position_grille, s]));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        gap: 12,
      }}
    >
      {cells.map((cell) => {
        const step = stepsByPosition.get(cell.index);
        if (!step) return <div key={cell.index} />;
        const showText = resolveTextVisible(routine.afficher_texte_global, step.afficher_texte_override);
        return (
          <button
            key={cell.index}
            type="button"
            onClick={() => speak(step.libelle)}
            className="flex flex-col items-center gap-1 p-2"
            style={{ border: '1px solid var(--border)', borderRadius: 8 }}
            aria-label={step.libelle}
          >
            <img src={step.picto_url} alt="" style={{ width: 64, height: 64 }} />
            {showText && <span className="text-sm">{step.libelle}</span>}
          </button>
        );
      })}
    </div>
  );
}
