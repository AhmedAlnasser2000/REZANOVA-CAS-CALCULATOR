export type LinearAlgebraEditorParseErrorReason =
  | 'empty-expression'
  | 'placeholder'
  | 'invalid-matrix-literal'
  | 'invalid-number'
  | 'unsupported-equation-shape'
  | 'unsupported-expression';

export class ParseFailure extends Error {
  readonly reason: LinearAlgebraEditorParseErrorReason;

  constructor(
    reason: LinearAlgebraEditorParseErrorReason,
    message: string,
  ) {
    super(message);
    this.reason = reason;
  }
}

export function fail(reason: LinearAlgebraEditorParseErrorReason, message: string): never {
  throw new ParseFailure(reason, message);
}

