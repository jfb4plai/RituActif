import type { RenduType, PictoSource } from '../../lib/types';
import { PictogramPicker } from './PictogramPicker';

export interface DraftStep {
  libelle: string;
  pictoUrl: string;
  pictoSource: PictoSource;
  horaire: string;
  afficherTexteOverride: boolean | null;
}

interface StepEditorProps {
  step: DraftStep;
  typeRendu: RenduType;
  afficherTexteGlobal: boolean;
  onChange: (patch: Partial<DraftStep>) => void;
  onRemove: () => void;
}

export function StepEditor({ step, typeRendu, afficherTexteGlobal, onChange, onRemove }: StepEditorProps) {
  return (
    <div className="flex gap-3 items-start flex-wrap border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
      <input
        className="plai-input"
        placeholder='ex: "se laver les mains"'
        value={step.libelle}
        onChange={(e) => onChange({ libelle: e.target.value })}
        aria-label="Libellé de l'étape"
        style={{ minWidth: 0, flex: '1 1 200px' }}
      />

      <PictogramPicker
        libelle={step.libelle}
        pictoUrl={step.pictoUrl}
        onSelect={(url, source) => onChange({ pictoUrl: url, pictoSource: source })}
      />

      {typeRendu === 'emploi_du_temps' && (
        <input
          className="plai-input"
          type="time"
          value={step.horaire}
          onChange={(e) => onChange({ horaire: e.target.value })}
          aria-label="Heure de cette étape"
        />
      )}

      <select
        className="plai-input"
        value={step.afficherTexteOverride === null ? 'herite' : step.afficherTexteOverride ? 'oui' : 'non'}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ afficherTexteOverride: v === 'herite' ? null : v === 'oui' });
        }}
        aria-label="Affichage du texte pour cette étape"
      >
        <option value="herite">Texte : suit le réglage global ({afficherTexteGlobal ? 'affiché' : 'masqué'})</option>
        <option value="oui">Texte : toujours affiché (travail lexical ciblé)</option>
        <option value="non">Texte : toujours masqué</option>
      </select>

      <button
        type="button"
        onClick={onRemove}
        aria-label={step.libelle ? `Supprimer l'étape : ${step.libelle}` : 'Supprimer cette étape'}
      >
        ✕
      </button>
    </div>
  );
}
