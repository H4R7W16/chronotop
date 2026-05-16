import { useTranslation } from 'react-i18next';
import { localized, type LocalizedString } from '@chronotop/shared';

/**
 * Gibt eine Auflösungsfunktion zurück, die LocalizedString-Werte in die
 * aktuelle UI-Sprache übersetzt. Fällt auf Deutsch zurück, dann auf
 * irgendeine vorhandene Übersetzung.
 *
 * Beispiel:
 *   const loc = useLocalized();
 *   return <h2>{loc(event.title)}</h2>;
 */
export function useLocalized() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (value: LocalizedString | undefined, fallback = ''): string =>
    localized(value ?? '', lang, fallback);
}
