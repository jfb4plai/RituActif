import { useState } from 'react';
import { searchPictograms } from '../../lib/arasaac';
import { uploadPersoPicto } from '../../lib/storage';
import type { Pictogram } from '../../lib/arasaacMapper';
import type { PictoSource } from '../../lib/types';

interface PictogramPickerProps {
  libelle: string;
  pictoUrl: string;
  onSelect: (url: string, source: PictoSource) => void;
}

export function PictogramPicker({ libelle, pictoUrl, onSelect }: PictogramPickerProps) {
  const [candidates, setCandidates] = useState<Pictogram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!libelle.trim()) return;
    setError(null);
    setLoading(true);
    try {
      setCandidates(await searchPictograms(libelle));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setError(null);
    try {
      const url = await uploadPersoPicto(file);
      onSelect(url, 'perso');
      setCandidates([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
    }
  };

  if (pictoUrl) {
    return (
      <div className="flex items-center gap-2">
        <img src={pictoUrl} alt={libelle} style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <button type="button" className="plai-btn" onClick={() => onSelect('', 'arasaac')}>
          Changer
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="plai-btn"
        onClick={handleSearch}
        disabled={loading || !libelle.trim()}
      >
        {loading ? 'Recherche...' : 'Chercher un picto'}
      </button>
      {error && <div className="plai-error">{error}</div>}
      {candidates.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.url, 'arasaac')}
              style={{ border: '2px solid var(--border)', borderRadius: 8, padding: 4 }}
              title={p.keywords.join(', ')}
              aria-label={`Choisir ce pictogramme : ${p.keywords.join(', ')}`}
            >
              <img src={p.url} alt="" style={{ width: 48, height: 48 }} />
            </button>
          ))}
        </div>
      )}
      <label className="text-sm text-[var(--text3)] mt-2 block" style={{ cursor: 'pointer' }}>
        ou importer une image perso / composite
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </label>
    </div>
  );
}
