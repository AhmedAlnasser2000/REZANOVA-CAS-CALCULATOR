import { ComputeEngine } from '@cortex-js/compute-engine';
import { latexToPlainText } from '../notation/math-notation';
import {
  normalizeSymbolicDisplayLatex,
  type SymbolicDisplayPrefs,
} from '../notation/symbolic-display';
import {
  validateSerializableMathJson,
  type MathJsonValidationFailure,
} from './math-json';

const ce = new ComputeEngine();

export type PrinterProfileId = 'compatibility-v1' | 'pedagogical-v1';
export type PrinterTarget = 'canonical-latex' | 'visible-latex' | 'plain-text';

export type PrinterRequest = {
  profile: PrinterProfileId;
  target: PrinterTarget;
  displayPrefs?: SymbolicDisplayPrefs;
};

export type MathJsonPrinterRequest = PrinterRequest & {
  mathJson: unknown;
  compatibilityLatex?: string;
};

type ValidatedBoxedMathJsonPrinterRequest = PrinterRequest & {
  boxedExpression: {
    toLatex: (options: {
      prettify: false;
      invisibleMultiply: string;
      invisiblePlus: string;
      multiply: string;
    }) => string;
  };
  compatibilityLatex?: string;
};

export type PrintedMath =
  | {
      ok: true;
      text: string;
      canonicalLatex: string;
      serializedLatex?: string;
      profile: PrinterProfileId;
      target: PrinterTarget;
      source: 'math-json' | 'domain-adapter' | 'compatibility-fallback';
      fallbackReason?: MathJsonValidationFailure['reason'] | 'serialization-error';
    }
  | {
      ok: false;
      profile: PrinterProfileId;
      target: PrinterTarget;
      reason: MathJsonValidationFailure['reason'] | 'serialization-error' | 'empty-latex';
      message: string;
    };

const STRUCTURAL_LATEX_OPTIONS = {
  prettify: false,
  invisibleMultiply: '',
  invisiblePlus: '',
  multiply: '\\cdot',
} as const;

const PREPARED_STRUCTURAL_LATEX_OPTIONS = {
  ...STRUCTURAL_LATEX_OPTIONS,
  invisibleMultiply: '\\cdot',
} as const;

function renderTarget(
  canonicalLatex: string,
  request: PrinterRequest,
) {
  if (request.target === 'canonical-latex') {
    return canonicalLatex;
  }

  const visibleLatex = normalizeSymbolicDisplayLatex(
    canonicalLatex,
    request.displayPrefs,
  ) ?? canonicalLatex;
  return request.target === 'visible-latex'
    ? visibleLatex
    : latexToPlainText(visibleLatex);
}

export function printCompatibilityLatex(
  canonicalLatex: string,
  request: PrinterRequest,
  source: Extract<PrintedMath, { ok: true }>['source'] = 'domain-adapter',
): PrintedMath {
  if (!canonicalLatex.trim()) {
    return {
      ok: false,
      profile: request.profile,
      target: request.target,
      reason: 'empty-latex',
      message: 'Canonical LaTeX must not be empty.',
    };
  }

  return {
    ok: true,
    text: renderTarget(canonicalLatex, request),
    canonicalLatex,
    profile: request.profile,
    target: request.target,
    source,
  };
}

function printSerializedMathJson(
  request: PrinterRequest & { compatibilityLatex?: string },
  serialize: () => string,
): PrintedMath {
  let serializedLatex: string;
  try {
    serializedLatex = serialize();
  } catch {
    if (request.compatibilityLatex?.trim()) {
      const fallback = printCompatibilityLatex(
        request.compatibilityLatex,
        request,
        'compatibility-fallback',
      );
      return fallback.ok ? { ...fallback, fallbackReason: 'serialization-error' } : fallback;
    }
    return {
      ok: false,
      profile: request.profile,
      target: request.target,
      reason: 'serialization-error',
      message: 'Compute Engine could not serialize the validated MathJSON.',
    };
  }

  const canonicalLatex = request.profile === 'compatibility-v1'
    && request.compatibilityLatex?.trim()
    ? request.compatibilityLatex
    : serializedLatex;

  if (!canonicalLatex.trim()) {
    return {
      ok: false,
      profile: request.profile,
      target: request.target,
      reason: 'empty-latex',
      message: 'The printer produced empty canonical LaTeX.',
    };
  }

  return {
    ok: true,
    text: renderTarget(canonicalLatex, request),
    canonicalLatex,
    ...(canonicalLatex !== serializedLatex ? { serializedLatex } : {}),
    profile: request.profile,
    target: request.target,
    source: canonicalLatex === serializedLatex ? 'math-json' : 'compatibility-fallback',
  };
}

export function printValidatedBoxedMathJson(
  request: ValidatedBoxedMathJsonPrinterRequest,
): PrintedMath {
  return printSerializedMathJson(
    request,
    () => request.boxedExpression.toLatex(PREPARED_STRUCTURAL_LATEX_OPTIONS),
  );
}

export function printMathJson(request: MathJsonPrinterRequest): PrintedMath {
  const validation = validateSerializableMathJson(request.mathJson);
  if (!validation.ok) {
    if (request.compatibilityLatex?.trim()) {
      const fallback = printCompatibilityLatex(
        request.compatibilityLatex,
        request,
        'compatibility-fallback',
      );
      return fallback.ok
        ? { ...fallback, fallbackReason: validation.failure.reason }
        : fallback;
    }
    return {
      ok: false,
      profile: request.profile,
      target: request.target,
      reason: validation.failure.reason,
      message: validation.failure.message,
    };
  }

  return printSerializedMathJson(
    request,
    () => ce
      .box(validation.validated.value, { form: 'structural' })
      .toLatex(STRUCTURAL_LATEX_OPTIONS),
  );
}
