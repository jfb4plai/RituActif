// src/components/CommunicationEditor/NewItemForm.tsx
import { useState } from 'react';
import { addCommunicationItem } from '../../lib/communication';
import { PictogramPicker } from '../RoutineEditor/PictogramPicker';
import { FormField } from '../FormField';
import type { CommunicationCategory, CommunicationItem, PictoSource } from '../../lib/types';

interface NewItemFormProps {
  boardId: string;
  categorie: CommunicationCategory;
  nextOrdre: number;
  onAdded: (item: CommunicationItem) => void;
}

export function NewItemForm({ boardId, categorie, nextOrdre, onAdded }: NewItemFormProps) {
  const [libelle, setLibelle] = useState('');
  const [pictoUrl, setPictoUrl] = useState('');
  const [pictoSource, setPictoSource] = useState<PictoSource>('arasaac');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const canAdd = libelle.trim().length > 0 && pictoUrl.length > 0;

  const handleAdd = async () => {
    setError(null);
    setSaving(true);
    try {
      const item = await addCommunicationItem({
        boardId,
        categorie,
        libelle: libelle.trim(),
        pictoUrl,
        pictoSource,
        ordre: nextOrdre,
      });
      onAdded(item);
      setLibelle('');
      setPictoUrl('');
      setPictoSource('arasaac');
      setResetKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-3 items-start flex-wrap border rounded-lg p-2 mt-2" style={{ borderColor: 'var(--border)' }}>
      <FormField
        label="Nouveau mot"
        help="Le mot que l'élève dira en touchant ce picto — court et dans son vocabulaire habituel."
        style={{ minWidth: 0, flex: '1 1 160px', marginBottom: 0 }}
      >
        <input
          className="plai-input"
          placeholder='ex: "boire"'
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
        />
      </FormField>

      <PictogramPicker
        key={resetKey}
        libelle={libelle}
        pictoUrl={pictoUrl}
        onSelect={(url, source) => {
          setPictoUrl(url);
          setPictoSource(source);
        }}
      />

      <button className="plai-btn" type="button" disabled={!canAdd || saving} onClick={handleAdd}>
        {saving ? 'Ajout...' : '+ Ajouter'}
      </button>
      {error && <div className="plai-error">{error}</div>}
    </div>
  );
}
