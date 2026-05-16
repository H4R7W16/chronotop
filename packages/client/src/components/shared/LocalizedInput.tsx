import { useState } from 'react';
import { localized, type LocalizedString } from '@chronotop/shared';

interface LocalizedInputProps {
  id?: string;
  value: LocalizedString;
  onChange: (v: LocalizedString) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
}

type Lang = 'de' | 'en';

function toFields(value: LocalizedString): { de: string; en: string } {
  if (typeof value === 'string') return { de: value, en: '' };
  return { de: value['de'] ?? '', en: value['en'] ?? '' };
}

function fromFields(de: string, en: string): LocalizedString {
  if (!en.trim()) return de;
  return { de, en };
}

/**
 * Zweisprachiges Eingabefeld (Tab DE / EN).
 * Gibt einen LocalizedString zurück — plain string wenn nur Deutsch,
 * Objekt { de, en } wenn beide Sprachen befüllt sind.
 */
export function LocalizedInput({
  id,
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
  className = '',
}: LocalizedInputProps) {
  const [activeLang, setActiveLang] = useState<Lang>('de');
  const fields = toFields(value);

  const handleChange = (lang: Lang, text: string) => {
    const next = lang === 'de'
      ? fromFields(text, fields.en)
      : fromFields(fields.de, text);
    onChange(next);
  };

  const hasEn = !!fields.en.trim();
  const inputClass = `w-full input ${className}`;

  return (
    <div>
      {/* Language-Tab-Bar */}
      <div className="flex gap-px mb-1" role="tablist" aria-label="Sprache wählen">
        {(['de', 'en'] as Lang[]).map(lang => (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={activeLang === lang}
            onClick={() => setActiveLang(lang)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded-t border-b-0 transition-colors ${
              activeLang === lang
                ? 'bg-white border border-parchment-300 border-b-white text-ink-700 font-semibold'
                : 'bg-parchment-100 text-ink-400 border border-transparent hover:text-ink-600'
            }`}
          >
            {lang.toUpperCase()}
            {lang === 'en' && hasEn && (
              <span className="ml-1 text-verdigris-500">●</span>
            )}
          </button>
        ))}
      </div>

      {/* Input area */}
      {multiline ? (
        <textarea
          id={activeLang === 'de' ? id : undefined}
          value={activeLang === 'de' ? fields.de : fields.en}
          onChange={e => handleChange(activeLang, e.target.value)}
          rows={rows}
          placeholder={placeholder ?? (activeLang === 'en' ? 'English translation (optional)' : undefined)}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input
          id={activeLang === 'de' ? id : undefined}
          type="text"
          value={activeLang === 'de' ? fields.de : fields.en}
          onChange={e => handleChange(activeLang, e.target.value)}
          placeholder={placeholder ?? (activeLang === 'en' ? 'English translation (optional)' : undefined)}
          className={inputClass}
        />
      )}

      {/* Vorschau der anderen Sprache */}
      {activeLang === 'de' && hasEn && (
        <p className="text-[10px] text-ink-400 mt-0.5">EN: {fields.en}</p>
      )}
      {activeLang === 'en' && fields.de && (
        <p className="text-[10px] text-ink-400 mt-0.5">DE: {localized(value, 'de')}</p>
      )}
    </div>
  );
}
