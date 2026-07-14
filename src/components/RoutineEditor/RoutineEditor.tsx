import { useState } from 'react';
import { createRoutine, addStep } from '../../lib/routines';
import type { RenduType, RattachementType, GridConfig } from '../../lib/types';
import { FalcSimplifyPanel } from './FalcSimplifyPanel';
import { StepEditor, type DraftStep } from './StepEditor';
import { GridConfigPanel } from './GridConfigPanel';
import { FormField } from '../FormField';

interface RoutineEditorProps {
  onDone: (routineId: string) => void;
  onCancel: () => void;
}

export function RoutineEditor({ onDone, onCancel }: RoutineEditorProps) {
  const [nom, setNom] = useState('');
  const [typeRendu, setTypeRendu] = useState<RenduType>('sequentiel');
  const [rattachementType, setRattachementType] = useState<RattachementType>('classe');
  const [rattachementCodeEleve, setRattachementCodeEleve] = useState('');
  const [gridConfig, setGridConfig] = useState<GridConfig>({ rows: 3, cols: 3, pageFormat: 'a4-portrait' });
  const [afficherTexteGlobal, setAfficherTexteGlobal] = useState(true);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDraftSteps = (libelles: string[]) => {
    setSteps((prev) => [
      ...prev,
      ...libelles.map((libelle) => ({
        libelle,
        pictoUrl: '',
        pictoSource: 'arasaac' as const,
        horaire: '',
        afficherTexteOverride: null,
      })),
    ]);
  };

  const updateStep = (index: number, patch: Partial<DraftStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const missingPictoIndex = steps.findIndex((s) => !s.pictoUrl);
  const disabledReason =
    nom.trim().length === 0
      ? 'Donnez un nom à la planche pour continuer.'
      : steps.length === 0
        ? 'Ajoutez au moins une étape pour continuer.'
        : missingPictoIndex !== -1
          ? `Choisissez un pictogramme pour l'étape ${missingPictoIndex + 1} avant de générer.`
          : null;
  const canGenerate = disabledReason === null;

  const handleGenerate = async () => {
    setError(null);
    setSaving(true);
    try {
      const routine = await createRoutine({
        nom,
        typeRendu,
        rattachementType,
        rattachementCodeEleve: rattachementType === 'eleve' ? rattachementCodeEleve : undefined,
        configGrille: typeRendu === 'grille' ? gridConfig : undefined,
        afficherTexteGlobal,
      });
      await Promise.all(
        steps.map((s, index) =>
          addStep({
            routineId: routine.id,
            ordre: index,
            libelle: s.libelle,
            pictoUrl: s.pictoUrl,
            pictoSource: s.pictoSource,
            horaire: s.horaire || undefined,
            afficherTexteOverride: s.afficherTexteOverride,
            positionGrille: typeRendu === 'grille' ? index : undefined,
          })
        )
      );
      onDone(routine.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="plai-section">
      <button type="button" onClick={onCancel} className="text-sm text-[var(--text3)] mb-4">
        ← Retour
      </button>

      <div className="plai-card">
        <FormField label="Nom de la planche" help="Sert à retrouver cette planche dans votre tableau de bord.">
          <input
            className="plai-input"
            placeholder='ex: "Retour de récré"'
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </FormField>

        <FormField label="Type de rendu">
          <select
            className="plai-input"
            value={typeRendu}
            onChange={(e) => setTypeRendu(e.target.value as RenduType)}
          >
            <option value="sequentiel">Séquentiel court (routine ponctuelle)</option>
            <option value="emploi_du_temps">Emploi du temps (avec horaires)</option>
            <option value="grille">Grille (TLA / mémo-consigne)</option>
          </select>
        </FormField>

        <FormField label="Rattachement">
          <select
            className="plai-input"
            value={rattachementType}
            onChange={(e) => setRattachementType(e.target.value as RattachementType)}
          >
            <option value="classe">Générique classe</option>
            <option value="eleve">Élève (code anonyme)</option>
          </select>
        </FormField>
        {rattachementType === 'eleve' && (
          <FormField
            label="Code élève anonyme"
            help="Jamais de nom réel — un code anonyme suffit à retrouver la planche."
          >
            <input
              className="plai-input"
              placeholder="ex: Élève-7"
              value={rattachementCodeEleve}
              onChange={(e) => setRattachementCodeEleve(e.target.value)}
            />
          </FormField>
        )}

        {typeRendu === 'grille' && <GridConfigPanel value={gridConfig} onChange={setGridConfig} />}

        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={afficherTexteGlobal}
            onChange={(e) => setAfficherTexteGlobal(e.target.checked)}
          />
          Afficher le mot sous chaque pictogramme
        </label>
      </div>

      <FalcSimplifyPanel onStepsReady={addDraftSteps} />

      <div className="plai-card mt-4">
        <h3 className="font-medium mb-2">Étapes ({steps.length})</h3>
        <p className="text-xs text-[var(--text3)] mb-2">
          {typeRendu === 'grille'
            ? "L'ordre ci-dessous détermine la position dans la grille (de gauche à droite, ligne par ligne)."
            : "L'ordre ci-dessous détermine l'ordre affiché dans la planche."}
        </p>
        <div className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  aria-label="Déplacer vers le haut"
                  title="Déplacer vers le haut"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === steps.length - 1}
                  aria-label="Déplacer vers le bas"
                  title="Déplacer vers le bas"
                >
                  ↓
                </button>
              </div>
              <StepEditor
                step={step}
                typeRendu={typeRendu}
                afficherTexteGlobal={afficherTexteGlobal}
                onChange={(patch) => updateStep(index, patch)}
                onRemove={() => removeStep(index)}
              />
            </div>
          ))}
        </div>
        <button className="plai-btn mt-3" type="button" onClick={() => addDraftSteps([''])}>
          + Ajouter une étape
        </button>
      </div>

      {error && <div className="plai-error mt-3">{error}</div>}

      <button className="plai-btn mt-4" type="button" disabled={!canGenerate || saving} onClick={handleGenerate}>
        {saving ? 'Génération...' : 'Générer la planche'}
      </button>
      {disabledReason && !saving && (
        <p className="text-xs text-[var(--text3)] mt-1">{disabledReason}</p>
      )}
    </div>
  );
}
