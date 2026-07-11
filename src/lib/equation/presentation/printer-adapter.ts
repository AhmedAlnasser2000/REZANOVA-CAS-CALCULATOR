import {
  defineCanonicalPrinterAdapter,
  printCompatibilityLatex,
} from '../../display/printer';
import {
  renderFiniteRootPresentation,
  type EquationFiniteRootPresentation,
  type EquationPresentationContext,
} from './finite-roots';

export const equationFiniteRootPrinterAdapter = defineCanonicalPrinterAdapter<
  EquationFiniteRootPresentation,
  EquationPresentationContext
>({
  id: 'equation-finite-root-v1',
  print(root, request, context) {
    return printCompatibilityLatex(
      renderFiniteRootPresentation(root, context),
      request,
      'domain-adapter',
    );
  },
});
