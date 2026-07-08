import type { GridConfig } from '../../lib/types';

interface GridConfigPanelProps {
  value: GridConfig;
  onChange: (config: GridConfig) => void;
}

export function GridConfigPanel({ value, onChange }: GridConfigPanelProps) {
  return (
    <div className="mt-4">
      <label className="block mb-1 font-medium">Grille (TLA / mémo-consigne)</label>
      <div className="flex gap-2 items-center">
        <input
          className="plai-input"
          type="number"
          min={1}
          max={10}
          value={value.rows}
          onChange={(e) => onChange({ ...value, rows: Number(e.target.value) })}
          aria-label="nombre de lignes"
        />
        <span>lignes ×</span>
        <input
          className="plai-input"
          type="number"
          min={1}
          max={10}
          value={value.cols}
          onChange={(e) => onChange({ ...value, cols: Number(e.target.value) })}
          aria-label="nombre de colonnes"
        />
        <span>colonnes</span>
      </div>
      <select
        className="plai-input mt-2"
        value={value.pageFormat}
        onChange={(e) => onChange({ ...value, pageFormat: e.target.value as GridConfig['pageFormat'] })}
        aria-label="format de page"
      >
        <option value="a4-portrait">A4 portrait</option>
        <option value="a4-paysage">A4 paysage</option>
      </select>
      <p className="text-xs text-[var(--text3)] mt-1">
        ex: 5 lignes × 3 colonnes pour un mémo-consigne A4 portrait.
      </p>
    </div>
  );
}
