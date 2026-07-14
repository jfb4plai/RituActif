import { speak } from '../../lib/tts';
import { joinPhrase, MAX_PHRASE_LENGTH } from '../../lib/phrase';
import { recordPhrase } from '../../lib/communication';
import type { CommunicationItem } from '../../lib/types';

interface PhraseStripProps {
  boardId: string;
  strip: CommunicationItem[];
  onClear: () => void;
}

export function PhraseStrip({ boardId, strip, onClear }: PhraseStripProps) {
  const handleSpeak = () => {
    const phrase = joinPhrase(strip.map((i) => i.libelle));
    if (!phrase) return;
    if (!speak(phrase)) return;
    recordPhrase(boardId, phrase).catch((e) => console.error('Échec de l\'enregistrement de la phrase', e));
    onClear();
  };

  return (
    <div className="plai-card flex items-center gap-2 flex-wrap" style={{ minHeight: 88 }}>
      {strip.length === 0 && (
        <span className="text-sm text-[var(--text3)]">Touchez des pictos pour composer une phrase...</span>
      )}
      {strip.map((item, index) => (
        <img
          key={`${item.id}-${index}`}
          src={item.picto_url}
          alt={item.libelle}
          style={{ width: 64, height: 64, objectFit: 'contain' }}
        />
      ))}
      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={onClear}
          disabled={strip.length === 0}
          aria-label="Effacer la phrase"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          ✕ Effacer
        </button>
        <button
          type="button"
          className="plai-btn"
          onClick={handleSpeak}
          disabled={strip.length === 0}
          aria-label="Dire la phrase"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          🔊 Dire la phrase
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {strip.length === 0
          ? ''
          : `Phrase en cours : ${joinPhrase(strip.map((i) => i.libelle))} (${strip.length}/${MAX_PHRASE_LENGTH} mots)`}
      </span>
    </div>
  );
}
