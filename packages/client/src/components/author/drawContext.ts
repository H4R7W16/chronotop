import { createContext, useContext } from 'react';

export interface DrawContextValue {
  drawMode: 'polygon' | 'movement' | null;
  setDrawMode: (m: 'polygon' | 'movement' | null) => void;
  drawPoints: number[][];
  setDrawPoints: (p: number[][] | ((prev: number[][]) => number[][])) => void;
}

export const DrawContext = createContext<DrawContextValue | null>(null);

export function useDrawContext(): DrawContextValue {
  const ctx = useContext(DrawContext);
  if (!ctx) {
    // Fallback: kein Provider (z.B. außerhalb des Authoring-Layouts) → no-op
    return {
      drawMode: null,
      setDrawMode: () => {},
      drawPoints: [],
      setDrawPoints: () => {},
    };
  }
  return ctx;
}
