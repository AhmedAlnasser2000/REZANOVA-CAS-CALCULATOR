import {
  MathFraction,
  MathRadical,
  MathRoundBrackets,
  MathRun,
  MathSquareBrackets,
  MathSubScript,
  MathSubSuperScript,
  MathSuperScript,
  type MathComponent,
} from 'docx';

const SYMBOLS: Readonly<Record<string, string>> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  approx: '≈', equiv: '≡', in: '∈', notin: '∉', subset: '⊂',
  subseteq: '⊆', cup: '∪', cap: '∩', to: '→', rightarrow: '→',
  leftarrow: '←', leftrightarrow: '↔', infinity: '∞', partial: '∂',
  nabla: '∇', sum: '∑', prod: '∏', int: '∫',
};

const WORD_OPERATORS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'ln', 'lim', 'max', 'min',
]);

class UnsupportedLatexError extends Error {}

class LatexMathParser {
  private index = 0;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  parse(): MathComponent[] {
    if (!this.source.trim() || this.source.length > 2_000) {
      throw new UnsupportedLatexError('Equation is empty or exceeds the audited conversion bound.');
    }
    const result = this.sequence();
    this.skipWhitespace();
    if (this.index !== this.source.length) throw new UnsupportedLatexError('Unexpected equation input.');
    return result;
  }

  private sequence(stop?: string): MathComponent[] {
    const result: MathComponent[] = [];
    while (this.index < this.source.length) {
      this.skipWhitespace();
      if (stop && this.source[this.index] === stop) {
        this.index += 1;
        return result;
      }
      if (this.index >= this.source.length) break;
      let atom = this.atom();
      let subScript: MathComponent[] | undefined;
      let superScript: MathComponent[] | undefined;
      while (this.source[this.index] === '_' || this.source[this.index] === '^') {
        const kind = this.source[this.index];
        this.index += 1;
        const script = this.script();
        if (kind === '_') subScript = script;
        else superScript = script;
      }
      if (subScript && superScript) {
        atom = new MathSubSuperScript({ children: [atom], subScript, superScript });
      } else if (subScript) {
        atom = new MathSubScript({ children: [atom], subScript });
      } else if (superScript) {
        atom = new MathSuperScript({ children: [atom], superScript });
      }
      result.push(atom);
    }
    if (stop) throw new UnsupportedLatexError('Unclosed equation group.');
    return result;
  }

  private atom(): MathComponent {
    const character = this.source[this.index];
    if (character === '\\') return this.command();
    if (character === '{') {
      this.index += 1;
      const children = this.sequence('}');
      if (children.length === 1) return children[0];
      throw new UnsupportedLatexError('A grouped expression requires a supported structure.');
    }
    if (character === '(') {
      this.index += 1;
      return new MathRoundBrackets({ children: this.sequence(')') });
    }
    if (character === '[') {
      this.index += 1;
      return new MathSquareBrackets({ children: this.sequence(']') });
    }
    if ('})]'.includes(character) || character === '&' || character === '%') {
      throw new UnsupportedLatexError('Unsupported equation delimiter.');
    }
    this.index += 1;
    return new MathRun(character);
  }

  private command(): MathComponent {
    this.index += 1;
    const match = /^[A-Za-z]+/u.exec(this.source.slice(this.index));
    if (!match) {
      const escaped = this.source[this.index];
      if (!escaped || !'{}_^%&#$ '.includes(escaped)) {
        throw new UnsupportedLatexError('Unsupported equation escape.');
      }
      this.index += 1;
      return new MathRun(escaped);
    }
    const name = match[0];
    this.index += name.length;
    if (name === 'frac') {
      return new MathFraction({ numerator: this.requiredGroup(), denominator: this.requiredGroup() });
    }
    if (name === 'sqrt') {
      if (this.source[this.index] === '[') {
        throw new UnsupportedLatexError('Indexed radicals use a visual fallback.');
      }
      return new MathRadical({ children: this.requiredGroup() });
    }
    if (name === 'left' || name === 'right') {
      const delimiter = this.source[this.index];
      if (!delimiter || !'()[]|.'.includes(delimiter)) {
        throw new UnsupportedLatexError('Unsupported scalable delimiter.');
      }
      this.index += 1;
      return new MathRun(delimiter === '.' ? '' : delimiter);
    }
    if (WORD_OPERATORS.has(name)) return new MathRun(name);
    const symbol = SYMBOLS[name];
    if (symbol) return new MathRun(symbol);
    if (name === 'text' || name === 'mathrm' || name === 'operatorname') {
      const text = this.requiredPlainGroup();
      return new MathRun(text);
    }
    throw new UnsupportedLatexError(`Unsupported LaTeX command: \\${name}`);
  }

  private requiredGroup(): MathComponent[] {
    this.skipWhitespace();
    if (this.source[this.index] !== '{') {
      throw new UnsupportedLatexError('A required equation group is missing.');
    }
    this.index += 1;
    return this.sequence('}');
  }

  private requiredPlainGroup(): string {
    this.skipWhitespace();
    if (this.source[this.index] !== '{') throw new UnsupportedLatexError('Text group is missing.');
    const start = ++this.index;
    while (this.index < this.source.length && this.source[this.index] !== '}') {
      if (this.source[this.index] === '\\' || this.source[this.index] === '{') {
        throw new UnsupportedLatexError('Nested text formatting uses a visual fallback.');
      }
      this.index += 1;
    }
    if (this.index >= this.source.length) throw new UnsupportedLatexError('Unclosed text group.');
    const text = this.source.slice(start, this.index);
    this.index += 1;
    return text;
  }

  private script(): MathComponent[] {
    this.skipWhitespace();
    if (this.source[this.index] === '{') {
      this.index += 1;
      return this.sequence('}');
    }
    return [this.atom()];
  }

  private skipWhitespace() {
    while (/\s/u.test(this.source[this.index] ?? '')) this.index += 1;
  }
}

export type NotebookDocxMathConversion =
  | { readonly kind: 'omml'; readonly children: readonly MathComponent[] }
  | { readonly kind: 'fallback'; readonly reason: string };

export function convertNotebookLatexToOmml(latex: string): NotebookDocxMathConversion {
  try {
    return { kind: 'omml', children: new LatexMathParser(latex).parse() };
  } catch (error) {
    return {
      kind: 'fallback',
      reason: error instanceof Error ? error.message : 'Equation is outside the audited OMML subset.',
    };
  }
}
