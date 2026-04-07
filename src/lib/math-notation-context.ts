import { createContext, useContext } from 'react';
import type { MathNotationDisplay } from '../types/calculator';
import type { SymbolicDisplayPrefs } from './symbolic-display';

export type MathNotationContextValue = {
  notationMode: MathNotationDisplay;
  displayPrefs?: SymbolicDisplayPrefs;
};

export const mathNotationContext = createContext<MathNotationContextValue>({
  notationMode: 'rendered',
});

export function useMathNotation() {
  return useContext(mathNotationContext);
}
