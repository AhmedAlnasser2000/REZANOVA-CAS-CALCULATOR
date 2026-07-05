import { presentVerifiedIndefiniteAntiderivative } from '../../symbolic-engine/integration/presentation/antiderivative';
import type { CalculusCoreEvaluation } from './shared';

function mergePresentationDetails(
  existing: CalculusCoreEvaluation['detailSections'],
  presentation: CalculusCoreEvaluation['detailSections'],
) {
  if (!presentation?.length) {
    return existing;
  }

  const sections = existing ?? [];
  const trustIndex = sections.findIndex((section) => section.title === 'Trust');
  if (trustIndex < 0) {
    return [...sections, ...presentation];
  }

  return [
    ...sections.slice(0, trustIndex),
    ...presentation,
    ...sections.slice(trustIndex),
  ];
}

export function presentCalculusIndefiniteEvaluation(
  result: CalculusCoreEvaluation,
  integrand: unknown,
  variable: string,
): CalculusCoreEvaluation {
  if (result.error || !result.exactLatex) {
    return result;
  }

  const presentation = presentVerifiedIndefiniteAntiderivative({
    exactLatex: result.exactLatex,
    integrand,
    variable,
    verification: result.antiderivativeBackcheck,
  });
  if (!presentation) {
    return result;
  }

  return {
    ...result,
    exactLatex: presentation.exactLatex,
    answerRows: presentation.answerRows,
    antiderivativeBackcheck: presentation.verification,
    detailSections: mergePresentationDetails(
      result.detailSections,
      presentation.detailSections,
    ),
  };
}
