import type { GraphSourceV1 } from '../contracts';
import { validateGraphSource } from '../contracts';
import { classifyGraphMathJson } from './classifier';
import {
  GRAPH_PARSER_MAX_SOURCE_LENGTH,
  parseGraphLatexToStructuralMathJson,
} from './mathjson';
import { graphParserFailure, type GraphSourceClassificationV1 } from './types';

export function classifyGraphSource(
  source: GraphSourceV1,
): GraphSourceClassificationV1 {
  const validatedSource = validateGraphSource(source);
  if (!validatedSource.ok) {
    return graphParserFailure(
      'unsafe-expression',
      validatedSource.failure.reason,
      validatedSource.failure.path,
    );
  }
  const sourceLatex = validatedSource.validated.value.sourceLatex;
  if (sourceLatex.trim().length === 0) {
    return graphParserFailure('unsupported-relation', 'empty-source');
  }
  if (sourceLatex.length > GRAPH_PARSER_MAX_SOURCE_LENGTH) {
    return graphParserFailure('expression-budget-exceeded', 'source-length');
  }
  const parsed = parseGraphLatexToStructuralMathJson(sourceLatex);
  if (!parsed.ok) return parsed;
  return classifyGraphMathJson(parsed.mathJson);
}
