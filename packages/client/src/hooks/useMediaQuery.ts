import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [query]);

  return matches;
}

// Tablet-or-smaller: alles unter Desktop-Workbench (Phones, alle iPad-Orientierungen)
// Hochkant: <1024 Breite. Quer auf 11-Zoll-iPad: 1180x820 -> wir greifen Höhe<=900.
export const TABLET_MEDIA_QUERY =
  '(max-width: 1023px), (max-width: 1180px) and (max-height: 900px)';

export function useIsTablet(): boolean {
  return useMediaQuery(TABLET_MEDIA_QUERY);
}
