import type { PolynomialEquationView } from './mode-types';
import type {
  ComplexSolveRegion,
  NumericSolveInterval,
} from './solver-types';

export type EquationReplayTarget =
  | {
      screen: 'symbolic';
      equationLatex: string;
      equationSolveTarget?: string | null;
      complexRegion?: ComplexSolveRegion;
      numericInterval?: NumericSolveInterval;
    }
  | {
      screen: PolynomialEquationView;
      coefficients: number[];
      equationLatex: string;
    }
  | {
      screen: 'linear2' | 'linear3';
      equationLatex: string;
      system?: number[][];
    }
  | {
      screen: 'polynomialSystem2';
      equationLatex: string;
      polynomialSystem2Latex: [string, string];
    };

export type EquationReplaySeed =
  | {
      screen: 'symbolic';
      equationLatex: string;
      equationSolveTarget?: string | null;
      complexRegion?: ComplexSolveRegion;
      numericInterval?: NumericSolveInterval;
    }
  | {
      screen: PolynomialEquationView;
      coefficients: number[];
      equationLatex: string;
    }
  | {
      screen: 'linear2' | 'linear3';
      equationLatex: string;
      system: number[][];
    }
  | {
      screen: 'polynomialSystem2';
      equationLatex: string;
      polynomialSystem2Latex: [string, string];
    };
