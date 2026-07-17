// src/components/CommunicationView/LetterboardView.tsx
import { useState } from 'react';
import { speak } from '../../lib/tts';
import { recordPhrase } from '../../lib/communication';
import { ALPHABET_FR, appendChar, backspace, applyCase } from '../../lib/letterboard';
import { useHoldToSelect } from '../../hooks/useHoldToSelect';
import type { HoldConfig } from '../../lib/communicationSettings';

interface LetterboardViewProps {
  boardId: string;
  hold: HoldConfig;
}

interface LetterKeyProps {
  char: string;
  label: string;
  hold: HoldConfig;
  onConfirm: () => void;
}

function LetterKey({ char, label, hold, onConfirm }: LetterKeyProps) {
  const { pressing, onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onKeyDown } = useHoldToSelect(
    hold,
    onConfirm
  );

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      aria-label={char === ' ' ? 'Espace' : `Lettre ${char}`}
      style={{
        border: '2px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 44,
        fontSize: 20,
        background: pressing ? 'var(--teal)' : 'var(--surface)',
        color: pressing ? '#fff' : 'inherit',
        cursor: 'pointer',
        transform: pressing ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 100ms, background 100ms',
      }}
    >
      {label}
    </button>
  );
}

export function LetterboardView({ boardId, hold }: LetterboardViewProps) {
  const [message, setMessage] = useState('');
  const [uppercase, setUppercase] = useState(true);

  const handleKey = (char: string) => {
    setMessage((prev) => appendChar(prev, char));
  };

  const handleBackspace = () => {
    setMessage((prev) => backspace(prev));
  };

  const handleClearAll = () => {
    setMessage('');
  };

  const handleSpeak = () => {
    if (!message) return;
    if (!speak(message)) return;
    recordPhrase(boardId, message).catch((e) =>
      console.error("Échec de l'enregistrement de la phrase", e)
    );
    setMessage('');
  };

  const displayedMessage = applyCase(message, uppercase);

  return (
    <div className="plai-card mt-3">
      <div className="flex items-center gap-2 flex-wrap mb-3" style={{ minHeight: 60 }}>
        <span className="text-2xl flex-1" aria-live="polite">
          {displayedMessage || <span className="text-sm text-[var(--text3)]">Composez un mot...</span>}
        </span>
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={() => setUppercase((v) => !v)}
          aria-label="Basculer majuscules/minuscules"
          style={{ padding: '8px 14px', fontSize: 14 }}
        >
          {uppercase ? 'AB → ab' : 'ab → AB'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {ALPHABET_FR.map((char) => (
          <LetterKey
            key={char}
            char={char}
            label={applyCase(char, uppercase)}
            hold={hold}
            onConfirm={() => handleKey(char)}
          />
        ))}
        <LetterKey char=" " label="␣ Espace" hold={hold} onConfirm={() => handleKey(' ')} />
      </div>

      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={handleBackspace}
          disabled={message.length === 0}
          aria-label="Effacer la dernière lettre"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          ⌫ Effacer la lettre
        </button>
        <button
          type="button"
          className="plai-btn-ghost"
          onClick={handleClearAll}
          disabled={message.length === 0}
          aria-label="Effacer tout"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          ✕ Tout effacer
        </button>
        <button
          type="button"
          className="plai-btn"
          onClick={handleSpeak}
          disabled={message.length === 0}
          aria-label="Dire le mot"
          style={{ padding: '12px 20px', fontSize: 16 }}
        >
          🔊 Dire
        </button>
      </div>
    </div>
  );
}
