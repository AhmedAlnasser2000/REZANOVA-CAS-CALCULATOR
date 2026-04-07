import type { ReactNode } from 'react';
import type { MathNotationDisplay } from '../types/calculator';
import type { SymbolicDisplayPrefs } from '../lib/symbolic-display';
import { mathNotationContext } from '../lib/math-notation-context';

type MathNotationProviderProps = {
  notationMode: MathNotationDisplay;
  displayPrefs?: SymbolicDisplayPrefs;
  children: ReactNode;
};

export function MathNotationProvider({
  notationMode,
  displayPrefs,
  children,
}: MathNotationProviderProps) {
  return (
    <mathNotationContext.Provider value={{ notationMode, displayPrefs }}>
      {children}
    </mathNotationContext.Provider>
  );
}
