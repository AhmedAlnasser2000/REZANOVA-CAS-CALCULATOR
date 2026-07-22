import { standardAntiderivativeExpression } from '../../calculus/engine/antiderivative-expression';
import { tryTextbookByPartsRule } from './by-parts-textbook';
import { tryExpandedPartsRule } from './expanded-parts';
import { symbolicSuccess } from './metadata';
import { tryRischNormanOrchestrator } from './risch-norman/orchestrator';
import { tryPartsRuleDetailed } from './rules';
import { trySymbolicPartsRule } from './symbolic-coefficients';
import { tryTrigIbpFormalRule } from './trig-ibp-formal';
import type { IntegralResolution } from './types';

function nativeStandardAntiderivative(mathJson: unknown, source: string) {
  return standardAntiderivativeExpression({ mathJson, source });
}

export function tryIntegrationByPartsRoute(
  node: unknown,
  variable: string,
): IntegralResolution | undefined {
  const trigIbpFormal = tryTrigIbpFormalRule(node, variable);
  if (trigIbpFormal) {
    return symbolicSuccess(node, variable, trigIbpFormal.exactLatex, 'integration-by-parts',
      trigIbpFormal.verification, trigIbpFormal.exactSupplementLatex, trigIbpFormal.detailSections,
      nativeStandardAntiderivative(
        trigIbpFormal.antiderivativeNode,
        'calculus.integration:trig-ibp-formal',
      ),
      undefined,
      undefined,
      trigIbpFormal.trustMode ?? 'backcheck');
  }

  const textbookByParts = tryTextbookByPartsRule(node, variable);
  if (textbookByParts) {
    return symbolicSuccess(node, variable, textbookByParts.exactLatex, 'integration-by-parts',
      textbookByParts.verification, textbookByParts.exactSupplementLatex, textbookByParts.detailSections,
      textbookByParts.antiderivativeNode === undefined
        ? undefined
          : nativeStandardAntiderivative(
              textbookByParts.antiderivativeNode,
              'calculus.integration:textbook-by-parts',
          ),
      undefined,
      undefined,
      textbookByParts.antiderivativeNode === undefined ? 'backcheck' : 'precomputed-exact');
  }

  const byParts = tryPartsRuleDetailed(node, variable);
  if (byParts) {
    const exactLatex = typeof byParts === 'string' ? byParts : byParts.exactLatex;
    const antiderivativeNode = typeof byParts === 'string'
      ? undefined
      : byParts.antiderivativeNode;
    return symbolicSuccess(
      node,
      variable,
      exactLatex,
      'integration-by-parts',
      typeof byParts === 'string' ? undefined : byParts.verification,
      undefined,
      undefined,
      antiderivativeNode === undefined
        ? undefined
        : nativeStandardAntiderivative(
            antiderivativeNode,
            'calculus.integration:integration-by-parts',
          ),
    );
  }

  const symbolicParts = trySymbolicPartsRule(node, variable);
  if (symbolicParts) {
    return symbolicSuccess(
      node,
      variable,
      symbolicParts.exactLatex,
      'integration-by-parts',
      symbolicParts.verification,
      symbolicParts.exactSupplementLatex,
    );
  }

  const expandedByParts = tryExpandedPartsRule(node, variable);
  if (expandedByParts) {
    const antiderivativeNode = 'antiderivativeNode' in expandedByParts
      ? expandedByParts.antiderivativeNode
      : undefined;
    return symbolicSuccess(
      node,
      variable,
      expandedByParts.exactLatex,
      'integration-by-parts',
      expandedByParts.verification,
      undefined,
      undefined,
      antiderivativeNode === undefined
        ? undefined
        : nativeStandardAntiderivative(
            antiderivativeNode,
            'calculus.integration:expanded-integration-by-parts',
          ),
    );
  }

  const rischNorman = tryRischNormanOrchestrator(node, variable, {
    publicStrategies: ['integration-by-parts'],
  });
  return rischNorman
    ? symbolicSuccess(
      node,
      variable,
      rischNorman.exactLatex,
      rischNorman.publicStrategy,
      rischNorman.verification,
      rischNorman.exactSupplementLatex,
      undefined,
      rischNorman.antiderivativeNode === undefined
        ? undefined
        : nativeStandardAntiderivative(
            rischNorman.antiderivativeNode,
            'calculus.integration:risch-norman-integration-by-parts',
          ),
      undefined,
      undefined,
      rischNorman.antiderivativeNode === undefined ? 'backcheck' : 'precomputed-exact',
    )
    : undefined;
}
