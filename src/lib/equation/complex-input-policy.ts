export const EQUATION_IMAGINARY_UNIT_SYMBOL = 'i';
export const EQUATION_IMAGINARY_UNIT_COMMAND = 'imaginaryI';
export const EQUATION_IMAGINARY_UNIT_LATEX = `\\${EQUATION_IMAGINARY_UNIT_COMMAND}`;

const EQUATION_IMAGINARY_UNIT_PATTERN = /\\imaginaryI(?![A-Za-z])|(^|[^\\A-Za-z])i(?=$|[^A-Za-z])/u;

export function containsEquationImaginaryUnitLatex(latex: string | null | undefined) {
  return Boolean(latex && EQUATION_IMAGINARY_UNIT_PATTERN.test(latex));
}
