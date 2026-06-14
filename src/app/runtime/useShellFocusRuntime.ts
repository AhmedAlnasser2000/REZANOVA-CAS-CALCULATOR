import { type RefObject, useEffect } from 'react';
import type { MathfieldElement } from 'mathlive';
import {
  isPolynomialEquationScreen,
  isSimultaneousEquationScreen,
} from '../../lib/equation/equation-navigation';
import { isCalculusMode } from '../../lib/calculus/calculus-identity';
import type { CalculusRouteMeta } from '../../lib/calculus/workspace/navigation';
import type { GeometryRouteMeta } from '../../lib/geometry/navigation';
import type { StatisticsRouteMeta } from '../../lib/statistics/navigation';
import type { TrigRouteMeta } from '../../lib/trigonometry/navigation';
import type {
  CalculusScreen,
  CalculateRouteMeta,
  CalculateScreen,
  EquationRouteMeta,
  EquationScreen,
  GeometryScreen,
  GuideRouteMeta,
  ModeId,
  PolynomialEquationView,
  SimultaneousEquationView,
  StatisticsScreen,
  StatisticsWorkingSource,
  TrigScreen,
} from '../../types/calculator';

type InputRef = RefObject<HTMLInputElement | null>;
type MathfieldRef = RefObject<MathfieldElement | null>;
type PanelRef = RefObject<HTMLDivElement | null>;
type TextAreaRef = RefObject<HTMLTextAreaElement | null>;

type UseShellFocusRuntimeOptions = {
  activeFieldRef: MathfieldRef;
  calculusRouteMeta: CalculusRouteMeta | null;
  calculusScreen: CalculusScreen;
  advancedDefiniteFieldRef: MathfieldRef;
  advancedFiniteLimitFieldRef: MathfieldRef;
  advancedIndefiniteFieldRef: MathfieldRef;
  advancedInfiniteLimitFieldRef: MathfieldRef;
  advancedImproperFieldRef: MathfieldRef;
  advancedMenuPanelRef: PanelRef;
  angleConvertValueRef: InputRef;
  arcSectorRadiusRef: InputRef;
  calculateMenuPanelRef: PanelRef;
  calculateRouteMeta: CalculateRouteMeta | null;
  calculateScreen: CalculateScreen;
  circleRadiusRef: InputRef;
  coneRadiusRef: InputRef;
  cosineRuleSideARef: InputRef;
  cubeSideRef: InputRef;
  cuboidLengthRef: InputRef;
  currentMode: ModeId;
  cylinderRadiusRef: InputRef;
  derivativeFieldRef: MathfieldRef;
  derivativePointFieldRef: MathfieldRef;
  derivativePointValueRef: InputRef;
  distanceP1XRef: InputRef;
  equationMenuPanelRef: PanelRef;
  equationRouteMeta: EquationRouteMeta | null;
  equationScreen: EquationScreen;
  firstOrderOdeLhsFieldRef: MathfieldRef;
  geometryDraftFieldRef: MathfieldRef;
  geometryMenuPanelRef: PanelRef;
  geometryRouteMeta: GeometryRouteMeta | null;
  geometryScreen: GeometryScreen;
  guideMenuPanelRef: PanelRef;
  guideRouteMeta: GuideRouteMeta | null;
  guideSearchInputRef: InputRef;
  historyOpen: boolean;
  integralFieldRef: MathfieldRef;
  integralLowerRef: InputRef;
  isLauncherOpen: boolean;
  limitFieldRef: MathfieldRef;
  limitTargetRef: InputRef;
  lineEquationP1XRef: InputRef;
  maclaurinFieldRef: MathfieldRef;
  mainFieldRef: MathfieldRef;
  midpointP1XRef: InputRef;
  numericIvpFieldRef: MathfieldRef;
  partialDerivativeFieldRef: MathfieldRef;
  polynomialInputRefs: RefObject<Record<PolynomialEquationView, HTMLInputElement | null>>;
  rectangleWidthRef: InputRef;
  rightTriangleSideARef: InputRef;
  secondOrderA2Ref: InputRef;
  sideSurfaceOverlayOpen: boolean;
  sineRuleSideARef: InputRef;
  slopeP1XRef: InputRef;
  sphereRadiusRef: InputRef;
  squareSideRef: InputRef;
  statisticsBinomialNRef: InputRef;
  statisticsCorrelationXRef: InputRef;
  statisticsDatasetRef: TextAreaRef;
  statisticsDraftFieldRef: MathfieldRef;
  statisticsFrequencyValueRef: InputRef;
  statisticsMeanInferenceLevelRef: InputRef;
  statisticsMenuPanelRef: PanelRef;
  statisticsNormalMeanRef: InputRef;
  statisticsPoissonLambdaRef: InputRef;
  statisticsRegressionXRef: InputRef;
  statisticsRouteMeta: StatisticsRouteMeta | null;
  statisticsScreen: StatisticsScreen;
  statisticsWorkingSource: StatisticsWorkingSource;
  systemInputRefs: RefObject<Record<SimultaneousEquationView, HTMLElement | null>>;
  taylorFieldRef: MathfieldRef;
  triangleAreaBaseRef: InputRef;
  triangleHeronARef: InputRef;
  trigDraftFieldRef: MathfieldRef;
  trigMenuPanelRef: PanelRef;
  trigRouteMeta: TrigRouteMeta | null;
  trigScreen: TrigScreen;
};

export function useShellFocusRuntime({
  activeFieldRef,
  calculusRouteMeta,
  calculusScreen,
  advancedDefiniteFieldRef,
  advancedFiniteLimitFieldRef,
  advancedIndefiniteFieldRef,
  advancedInfiniteLimitFieldRef,
  advancedImproperFieldRef,
  advancedMenuPanelRef,
  angleConvertValueRef,
  arcSectorRadiusRef,
  calculateMenuPanelRef,
  calculateRouteMeta,
  calculateScreen,
  circleRadiusRef,
  coneRadiusRef,
  cosineRuleSideARef,
  cubeSideRef,
  cuboidLengthRef,
  currentMode,
  cylinderRadiusRef,
  derivativeFieldRef,
  derivativePointFieldRef,
  derivativePointValueRef,
  distanceP1XRef,
  equationMenuPanelRef,
  equationRouteMeta,
  equationScreen,
  firstOrderOdeLhsFieldRef,
  geometryDraftFieldRef,
  geometryMenuPanelRef,
  geometryRouteMeta,
  geometryScreen,
  guideMenuPanelRef,
  guideRouteMeta,
  guideSearchInputRef,
  historyOpen,
  integralFieldRef,
  integralLowerRef,
  isLauncherOpen,
  limitFieldRef,
  limitTargetRef,
  lineEquationP1XRef,
  maclaurinFieldRef,
  mainFieldRef,
  midpointP1XRef,
  numericIvpFieldRef,
  partialDerivativeFieldRef,
  polynomialInputRefs,
  rectangleWidthRef,
  rightTriangleSideARef,
  secondOrderA2Ref,
  sideSurfaceOverlayOpen,
  sineRuleSideARef,
  slopeP1XRef,
  sphereRadiusRef,
  squareSideRef,
  statisticsBinomialNRef,
  statisticsCorrelationXRef,
  statisticsDatasetRef,
  statisticsDraftFieldRef,
  statisticsFrequencyValueRef,
  statisticsMeanInferenceLevelRef,
  statisticsMenuPanelRef,
  statisticsNormalMeanRef,
  statisticsPoissonLambdaRef,
  statisticsRegressionXRef,
  statisticsRouteMeta,
  statisticsScreen,
  statisticsWorkingSource,
  systemInputRefs,
  taylorFieldRef,
  triangleAreaBaseRef,
  triangleHeronARef,
  trigDraftFieldRef,
  trigMenuPanelRef,
  trigRouteMeta,
  trigScreen,
}: UseShellFocusRuntimeOptions) {
  useEffect(() => {
    if (isLauncherOpen || historyOpen || sideSurfaceOverlayOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (currentMode === 'calculate') {
        if (calculateRouteMeta?.focusTarget === 'menu') {
          calculateMenuPanelRef.current?.focus();
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'body') {
          const targetField =
            calculateScreen === 'derivative'
              ? derivativeFieldRef.current
              : calculateScreen === 'derivativePoint'
                ? derivativePointFieldRef.current
                : calculateScreen === 'integral'
                  ? integralFieldRef.current
                  : calculateScreen === 'limit'
                    ? limitFieldRef.current
                    : null;
          targetField?.focus?.();
          activeFieldRef.current = targetField;
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'point') {
          derivativePointValueRef.current?.focus();
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'bounds') {
          integralLowerRef.current?.focus();
          return;
        }

        if (calculateRouteMeta?.focusTarget === 'target') {
          limitTargetRef.current?.focus();
          return;
        }

        mainFieldRef.current?.focus?.();
        activeFieldRef.current = mainFieldRef.current;
        return;
      }

      if (isCalculusMode(currentMode) && calculusRouteMeta) {
        if (calculusRouteMeta.focusTarget === 'menu') {
          advancedMenuPanelRef.current?.focus();
          return;
        }

        if (calculusScreen === 'derivative') {
          derivativeFieldRef.current?.focus?.();
          activeFieldRef.current = derivativeFieldRef.current;
          return;
        }

        if (calculusScreen === 'derivativePoint') {
          derivativePointFieldRef.current?.focus?.();
          activeFieldRef.current = derivativePointFieldRef.current;
          return;
        }

        if (calculusScreen === 'indefiniteIntegral') {
          advancedIndefiniteFieldRef.current?.focus?.();
          activeFieldRef.current = advancedIndefiniteFieldRef.current;
          return;
        }

        if (calculusScreen === 'definiteIntegral') {
          advancedDefiniteFieldRef.current?.focus?.();
          activeFieldRef.current = advancedDefiniteFieldRef.current;
          return;
        }

        if (calculusScreen === 'improperIntegral') {
          advancedImproperFieldRef.current?.focus?.();
          activeFieldRef.current = advancedImproperFieldRef.current;
          return;
        }

        if (calculusScreen === 'finiteLimit') {
          advancedFiniteLimitFieldRef.current?.focus?.();
          activeFieldRef.current = advancedFiniteLimitFieldRef.current;
          return;
        }

        if (calculusScreen === 'infiniteLimit') {
          advancedInfiniteLimitFieldRef.current?.focus?.();
          activeFieldRef.current = advancedInfiniteLimitFieldRef.current;
          return;
        }

        if (calculusScreen === 'maclaurin') {
          maclaurinFieldRef.current?.focus?.();
          activeFieldRef.current = maclaurinFieldRef.current;
          return;
        }

        if (calculusScreen === 'taylor') {
          taylorFieldRef.current?.focus?.();
          activeFieldRef.current = taylorFieldRef.current;
          return;
        }

        if (calculusScreen === 'partialDerivative') {
          partialDerivativeFieldRef.current?.focus?.();
          activeFieldRef.current = partialDerivativeFieldRef.current;
          return;
        }

        if (calculusScreen === 'odeFirstOrder') {
          firstOrderOdeLhsFieldRef.current?.focus?.();
          activeFieldRef.current = firstOrderOdeLhsFieldRef.current;
          return;
        }

        if (calculusScreen === 'odeSecondOrder') {
          secondOrderA2Ref.current?.focus();
          return;
        }

        if (calculusScreen === 'odeNumericIvp') {
          numericIvpFieldRef.current?.focus?.();
          activeFieldRef.current = numericIvpFieldRef.current;
          return;
        }
      }

      if (currentMode === 'trigonometry' && trigRouteMeta) {
        if (trigRouteMeta.focusTarget === 'menu') {
          trigMenuPanelRef.current?.focus();
          return;
        }

        if (trigRouteMeta.focusTarget === 'editor') {
          trigDraftFieldRef.current?.focus?.();
          activeFieldRef.current = trigDraftFieldRef.current;
          return;
        }

        if (trigScreen === 'rightTriangle') {
          rightTriangleSideARef.current?.focus();
          return;
        }

        if (trigScreen === 'sineRule') {
          sineRuleSideARef.current?.focus();
          return;
        }

        if (trigScreen === 'cosineRule') {
          cosineRuleSideARef.current?.focus();
          return;
        }

        if (trigScreen === 'angleConvert') {
          angleConvertValueRef.current?.focus();
          return;
        }
      }

      if (currentMode === 'geometry' && geometryRouteMeta) {
        if (geometryRouteMeta.focusTarget === 'menu') {
          geometryMenuPanelRef.current?.focus();
          return;
        }

        if (geometryRouteMeta.focusTarget === 'editor') {
          geometryDraftFieldRef.current?.focus?.();
          activeFieldRef.current = geometryDraftFieldRef.current;
          return;
        }

        if (geometryScreen === 'square') {
          squareSideRef.current?.focus();
          return;
        }

        if (geometryScreen === 'rectangle') {
          rectangleWidthRef.current?.focus();
          return;
        }

        if (geometryScreen === 'triangleArea') {
          triangleAreaBaseRef.current?.focus();
          return;
        }

        if (geometryScreen === 'triangleHeron') {
          triangleHeronARef.current?.focus();
          return;
        }

        if (geometryScreen === 'circle') {
          circleRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'arcSector') {
          arcSectorRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cube') {
          cubeSideRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cuboid') {
          cuboidLengthRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cylinder') {
          cylinderRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'cone') {
          coneRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'sphere') {
          sphereRadiusRef.current?.focus();
          return;
        }

        if (geometryScreen === 'distance') {
          distanceP1XRef.current?.focus();
          return;
        }

        if (geometryScreen === 'midpoint') {
          midpointP1XRef.current?.focus();
          return;
        }

        if (geometryScreen === 'slope') {
          slopeP1XRef.current?.focus();
          return;
        }

        if (geometryScreen === 'lineEquation') {
          lineEquationP1XRef.current?.focus();
        }
      }

      if (currentMode === 'statistics' && statisticsRouteMeta) {
        if (statisticsRouteMeta.focusTarget === 'menu') {
          statisticsMenuPanelRef.current?.focus();
          return;
        }

        if (statisticsRouteMeta.focusTarget === 'editor') {
          statisticsDraftFieldRef.current?.focus?.();
          activeFieldRef.current = statisticsDraftFieldRef.current;
          return;
        }

        if (statisticsScreen === 'binomial') {
          statisticsBinomialNRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'normal') {
          statisticsNormalMeanRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'poisson') {
          statisticsPoissonLambdaRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'meanInference') {
          statisticsMeanInferenceLevelRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'regression') {
          statisticsRegressionXRef.current?.focus();
          return;
        }

        if (statisticsScreen === 'correlation') {
          statisticsCorrelationXRef.current?.focus();
          return;
        }

        if (
          statisticsScreen === 'frequency'
          || (statisticsScreen === 'descriptive' && statisticsWorkingSource === 'frequencyTable')
        ) {
          statisticsFrequencyValueRef.current?.focus();
          return;
        }

        statisticsDatasetRef.current?.focus();
        return;
      }

      if (currentMode === 'guide' && guideRouteMeta) {
        if (guideRouteMeta.focusTarget === 'menu') {
          guideMenuPanelRef.current?.focus();
          return;
        }

        if (guideRouteMeta.focusTarget === 'search') {
          guideSearchInputRef.current?.focus();
          return;
        }

        return;
      }

      if (currentMode !== 'equation' || !equationRouteMeta) {
        return;
      }

      if (equationRouteMeta.focusTarget === 'menu') {
        equationMenuPanelRef.current?.focus();
        return;
      }

      if (equationRouteMeta.focusTarget === 'symbolic') {
        mainFieldRef.current?.focus?.();
        activeFieldRef.current = mainFieldRef.current;
        return;
      }

      if (
        equationRouteMeta.focusTarget === 'polynomial' &&
        isPolynomialEquationScreen(equationScreen)
      ) {
        polynomialInputRefs.current[equationScreen]?.focus();
        return;
      }

      if (
        equationRouteMeta.focusTarget === 'simultaneous' &&
        isSimultaneousEquationScreen(equationScreen)
      ) {
        systemInputRefs.current[equationScreen]?.focus();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    activeFieldRef,
    calculusRouteMeta,
    calculusScreen,
    advancedDefiniteFieldRef,
    advancedFiniteLimitFieldRef,
    advancedIndefiniteFieldRef,
    advancedInfiniteLimitFieldRef,
    advancedImproperFieldRef,
    advancedMenuPanelRef,
    angleConvertValueRef,
    arcSectorRadiusRef,
    calculateMenuPanelRef,
    calculateRouteMeta,
    calculateScreen,
    circleRadiusRef,
    coneRadiusRef,
    cosineRuleSideARef,
    cubeSideRef,
    cuboidLengthRef,
    currentMode,
    cylinderRadiusRef,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    distanceP1XRef,
    equationMenuPanelRef,
    equationRouteMeta,
    equationScreen,
    firstOrderOdeLhsFieldRef,
    geometryDraftFieldRef,
    geometryMenuPanelRef,
    geometryRouteMeta,
    geometryScreen,
    guideMenuPanelRef,
    guideRouteMeta,
    guideSearchInputRef,
    historyOpen,
    integralFieldRef,
    integralLowerRef,
    isLauncherOpen,
    limitFieldRef,
    limitTargetRef,
    lineEquationP1XRef,
    maclaurinFieldRef,
    mainFieldRef,
    midpointP1XRef,
    numericIvpFieldRef,
    partialDerivativeFieldRef,
    polynomialInputRefs,
    rectangleWidthRef,
    rightTriangleSideARef,
    secondOrderA2Ref,
    sideSurfaceOverlayOpen,
    sineRuleSideARef,
    slopeP1XRef,
    sphereRadiusRef,
    squareSideRef,
    statisticsBinomialNRef,
    statisticsCorrelationXRef,
    statisticsDatasetRef,
    statisticsDraftFieldRef,
    statisticsFrequencyValueRef,
    statisticsMeanInferenceLevelRef,
    statisticsMenuPanelRef,
    statisticsNormalMeanRef,
    statisticsPoissonLambdaRef,
    statisticsRegressionXRef,
    statisticsRouteMeta,
    statisticsScreen,
    statisticsWorkingSource,
    systemInputRefs,
    taylorFieldRef,
    triangleAreaBaseRef,
    triangleHeronARef,
    trigDraftFieldRef,
    trigMenuPanelRef,
    trigRouteMeta,
    trigScreen,
  ]);
}
