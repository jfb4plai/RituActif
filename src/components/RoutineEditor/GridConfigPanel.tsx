import type { GridConfig } from '../../lib/types';
import { FormField } from '../FormField';

interface GridConfigPanelProps {
  value: GridConfig;
  onChange: (config: GridConfig) => void;
}

export function GridConfigPanel({ value, onChange }: GridConfigPanelProps) {
  return (
    <fieldset className="mt-4" style={{ border: 'none', padding: 0, margin: '1rem 0 0' }}>
      <legend className="block mb-1 font-medium">Grille (TLA / mémo-consigne)</legend>
      <div className="flex gap-2 items-end">
        <FormField label="Lignes" style={{ marginBottom: 0 }}>
          <input
            className="plai-input"
            type="number"
            min={1}
            max={10}
            value={value.rows}
            onChange={(e) => onChange({ ...value, rows: Number(e.target.value) })}
          />
        </FormField>
        <span className="pb-2">×</span>
        <FormField label="Colonnes" style={{ marginBottom: 0 }}>
          <input
            className="plai-input"
            type="number"
            min={1}
            max={10}
            value={value.cols}
            onChange={(e) => onChange({ ...value, cols: Number(e.target.value) })}
          />
        </FormField>
      </div>
      <FormField label="Format de page" style={{ marginTop: '0.5rem' }}>
        <select
          className="plai-input"
          value={value.pageFormat}
          onChange={(e) => onChange({ ...value, pageFormat: e.target.value as GridConfig['pageFormat'] })}
        >
          <option value="a4-portrait">A4 portrait</option>
          <option value="a4-paysage">A4 paysage</option>
        </select>
      </FormField>
      <p className="text-xs text-[var(--text3)] mt-1">
        ex: 5 lignes × 3 colonnes pour un mémo-consigne A4 portrait.
      </p>
    </fieldset>
  );
}
