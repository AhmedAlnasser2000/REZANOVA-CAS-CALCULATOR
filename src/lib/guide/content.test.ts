import { describe, expect, it } from 'vitest'
import { ACTIVE_CAPABILITIES } from '../virtual-keyboard/capabilities'
import {
  getActiveGuideArticles,
  getGuideArticle,
  getGuideArticlesForDomain,
  getGuideHomeEntries,
  getGuideModeRef,
} from './content'

describe('guide content', () => {
  it('exposes the active home entries including Guide utilities', () => {
    const entries = getGuideHomeEntries(ACTIVE_CAPABILITIES)

    expect(entries.map((entry) => entry.title)).toEqual([
      'Basics',
      'Algebra',
      'Discrete',
      'Calculus',
      'Linear Algebra',
      'Trigonometry',
      'Geometry',
      'Symbol Lookup',
      'Mode Guide',
    ])
  })

  it('keeps only active guide articles visible', () => {
    const articleIds = getActiveGuideArticles(ACTIVE_CAPABILITIES).map((article) => article.id)

    expect(articleIds).toContain('algebra-manipulation')
    expect(articleIds).toContain('discrete-operators')
    expect(articleIds).toContain('calculus-integrals-limits')
    expect(articleIds).toContain('linear-algebra-matrix-vector')
    expect(articleIds).toContain('advanced-integrals')
    expect(articleIds).toContain('trig-special-angles')
    expect(articleIds).toContain('geometry-coordinate')
  })

  it('describes the current calculator modes', () => {
    expect(getGuideModeRef('equation')?.title).toBe('Equation')
    expect(getGuideModeRef('table')?.bestFor[0]).toContain('Function tables')
    expect(getGuideModeRef('calculus')?.title).toBe('Calculus')
    expect(getGuideModeRef('trigonometry')?.title).toBe('Trigonometry')
    expect(getGuideModeRef('statistics')?.title).toBe('Statistics')
    expect(getGuideModeRef('geometry')?.title).toBe('Geometry')
  })

  it('adds teaching-first sections to rewritten guide articles', () => {
    const advancedIntegrals = getGuideArticle('advanced-integrals')
    const advancedPartials = getGuideArticle('advanced-partials')
    const basicsKeyboard = getGuideArticle('basics-keyboard')
    const advancedSeries = getGuideArticle('advanced-series')
    const calculusDerivatives = getGuideArticle('calculus-derivatives')
    const algebraManipulation = getGuideArticle('algebra-manipulation')

    expect(advancedIntegrals?.whatItIs.length).toBeGreaterThan(0)
    expect(advancedIntegrals?.whatItMeans?.length).toBeGreaterThan(0)
    expect(advancedPartials?.whatItIs.length).toBeGreaterThan(0)
    expect(advancedPartials?.whatItMeans?.join(' ')).toContain('other variables')
    expect(advancedSeries?.whatItMeans?.length).toBeGreaterThan(0)
    expect(basicsKeyboard?.whatItMeans).toBeUndefined()
    expect(advancedIntegrals?.examples[0]?.steps.length).toBeGreaterThan(0)
    expect(advancedPartials?.examples[0]?.steps.length).toBeGreaterThan(0)
    expect(calculusDerivatives?.whatItMeans?.join(' ')).toContain('product rule')
    expect(algebraManipulation?.whatItMeans?.join(' ')).toContain('BIDMAS')
  })

  it('routes calculus examples into the calculate workbench', () => {
    const derivativeArticle = getGuideArticle('calculus-derivatives')
    const integralArticle = getGuideArticle('calculus-integrals-limits')
    const functionPowerExample = derivativeArticle?.examples.find((example) => example.id === 'calc-derivative-function-power')
    const exactDefiniteExample = integralArticle?.examples.find((example) => example.id === 'calc-integral-definite-exact')
    const repeatedPartialFractionExample = integralArticle?.examples.find((example) => example.id === 'calc-integral-partial-fractions-repeated')
    const unsafeDefiniteExample = integralArticle?.examples.find((example) => example.id === 'calc-integral-definite-unsafe')
    const limitExample = integralArticle?.examples.find((example) => example.id === 'calc-limit')
    const directionalLimitExample = integralArticle?.examples.find((example) => example.id === 'calc-limit-directional-pole')

    expect(derivativeArticle?.examples[0]?.launch.kind).toBe('load-expression')
    if (derivativeArticle?.examples[0]?.launch.kind !== 'load-expression') {
      throw new Error('Expected calculus derivative example to load into a tool')
    }
    expect(derivativeArticle.examples[0].launch.targetMode).toBe('calculus')
    expect(derivativeArticle.examples[0].launch.advancedCalcScreen).toBe('derivative')
    expect(functionPowerExample?.launch.kind).toBe('load-expression')
    if (functionPowerExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected function-power derivative example to load into a tool')
    }
    expect(functionPowerExample.launch.advancedCalcSeed?.bodyLatex).toContain('\\sin^2')

    expect(exactDefiniteExample?.launch.kind).toBe('load-expression')
    if (exactDefiniteExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected exact definite-integral example to load into a tool')
    }
    expect(exactDefiniteExample.launch.targetMode).toBe('calculus')
    expect(exactDefiniteExample.launch.advancedCalcScreen).toBe('definiteIntegral')
    expect(repeatedPartialFractionExample?.launch.kind).toBe('load-expression')
    if (repeatedPartialFractionExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected repeated partial-fraction example to load into a tool')
    }
    expect(repeatedPartialFractionExample.launch.advancedCalcScreen).toBe('indefiniteIntegral')
    expect(repeatedPartialFractionExample.launch.advancedCalcSeed?.bodyLatex).toContain('(x-1)^2')
    expect(unsafeDefiniteExample?.expected).toContain('controlled real-domain')

    expect(limitExample?.launch.kind).toBe('load-expression')
    if (limitExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected calculus limit example to load into a tool')
    }
    expect(limitExample.launch.advancedCalcScreen).toBe('finiteLimit')
    expect(limitExample.launch.advancedCalcSeed?.target).toBe('0')
    expect(directionalLimitExample?.launch.kind).toBe('load-expression')
    if (directionalLimitExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected directional limit example to load into a tool')
    }
    expect(directionalLimitExample.launch.advancedCalcSeed?.direction).toBe('right')
  })

  it('keeps legacy advanced calculus guide domain compatible', () => {
    const modeRef = getGuideModeRef('advancedCalculus')
    const legacyArticles = getGuideArticlesForDomain('advancedCalculus')

    expect(modeRef).toBeDefined()
    expect(modeRef?.summary).toContain('Legacy Calculus mode reference')
    expect(modeRef?.articleIds).toContain('advanced-partials')
    expect(legacyArticles.map((article) => article.id)).toContain('advanced-integrals')
    expect(getGuideArticle('advanced-integrals')?.summary).toContain('shared integral backend')
    const quadraticPartialFractionExample = getGuideArticle('advanced-integrals')?.examples.find(
      (example) => example.id === 'advanced-int-quadratic-partial-fractions',
    )
    expect(quadraticPartialFractionExample?.launch.kind).toBe('load-expression')
    if (quadraticPartialFractionExample?.launch.kind !== 'load-expression') {
      throw new Error('Expected quadratic partial-fraction example to load into a tool')
    }
    expect(quadraticPartialFractionExample.launch.advancedCalcScreen).toBe('indefiniteIntegral')
    expect(quadraticPartialFractionExample.launch.advancedCalcSeed?.bodyLatex).toContain('x^2+1')
    expect(getGuideArticle('advanced-limits')?.summary).toContain('shared finite/infinite limit backend')
    expect(getGuideArticle('advanced-series')?.examples[0]?.launch.advancedCalcScreen).toBe('maclaurin')
    expect(getGuideArticle('advanced-partials')?.examples[0]?.launch.advancedCalcScreen).toBe('partialDerivative')
  })

  it('exposes trig guide examples that target the new mode', () => {
    const trigFunctions = getGuideArticle('trig-functions')
    const trigSpecialAngles = getGuideArticle('trig-special-angles')
    const trigTriangles = getGuideArticle('trig-triangles')
    const trigPeriodPhase = getGuideArticle('trig-period-phase')
    const trigEquations = getGuideArticle('trig-equations')
    const algebraEquations = getGuideArticle('algebra-equations')

    expect(trigFunctions?.examples[0]?.launch.targetMode).toBe('calculate')
    expect(trigFunctions?.examples[0]?.launch.kind).toBe('load-expression')
    expect(trigSpecialAngles?.title).toBe('Unit Circle')
    expect(trigSpecialAngles?.summary).toContain('visual anchor')
    expect(trigSpecialAngles?.concepts.join(' ')).toContain('cos(theta) is the horizontal coordinate')
    expect(trigSpecialAngles?.examples[0]?.launch.trigScreen).toBe('angleConvert')
    expect(trigSpecialAngles?.examples[1]?.launch.targetMode).toBe('calculate')
    expect(trigTriangles?.examples[0]?.launch.kind).toBe('open-tool')
    expect(trigPeriodPhase?.summary).toContain('phase shift')
    expect(trigPeriodPhase?.concepts.join(' ')).toContain('argument must be affine in x')
    expect(trigPeriodPhase?.pitfalls.join(' ')).toContain('Use Equation for equations')
    expect(trigPeriodPhase?.examples[0]?.launch.kind).toBe('open-tool')
    expect(trigPeriodPhase?.examples[0]?.launch.trigScreen).toBe('periodPhase')
    expect(trigPeriodPhase?.examples[0]?.launch.trigSeed?.expressionLatex).toContain('\\sin')
    expect(trigEquations?.summary).toContain('Equation symbolic solve')
    expect(trigEquations?.concepts.join(' ')).toContain('Equation owns the product surface')
    expect(trigEquations?.pitfalls.join(' ')).toContain('routes forward to Equation')
    expect(algebraEquations?.concepts.join(' ')).toContain('exact range checks')
    expect(algebraEquations?.concepts.join(' ')).toContain('2log(x)-1=0')
    expect(algebraEquations?.concepts.join(' ')).toContain('ln(x)+ln(x+1)=2')
    expect(algebraEquations?.concepts.join(' ')).toContain('symbolic parameters')
    expect(algebraEquations?.pitfalls.join(' ')).toContain('Raw adjacent text')
    const paramExamples = algebraEquations?.examples.filter((example) => example.id.startsWith('algebra-equation-param-')) ?? []
    expect(paramExamples.map((example) => example.id)).toEqual([
      'algebra-equation-param-linear',
      'algebra-equation-param-quadratic',
      'algebra-equation-param-rational',
      'algebra-equation-param-carrier',
      'algebra-equation-param-exp-log',
      'algebra-equation-param-trig',
    ])
    for (const example of paramExamples) {
      expect(example.launch.kind).toBe('load-expression')
      if (example.launch.kind !== 'load-expression') {
        throw new Error('Expected parameterized Equation guide examples to load into Equation')
      }
      expect(example.launch.targetMode).toBe('equation')
      expect(example.launch.equationScreen).toBe('symbolic')
      expect(example.launch.equationSolveTarget).toBe('z')
    }
    expect(trigEquations?.examples[2]?.launch.targetMode).toBe('equation')
    expect(trigEquations?.examples[2]?.launch.equationScreen).toBe('symbolic')
  })

  it('exposes geometry guide examples that target Geometry mode', () => {
    const geometryCoordinate = getGuideArticle('geometry-coordinate')
    const geometryTriangles = getGuideArticle('geometry-triangles')
    const geometrySolids = getGuideArticle('geometry-solids-3d')

    expect(geometryCoordinate?.examples[0]?.launch.targetMode).toBe('geometry')
    expect(geometryCoordinate?.examples[0]?.launch.geometryScreen).toBe('distance')
    expect(geometryTriangles?.examples[1]?.launch.geometryScreen).toBe('triangleHeron')
    expect(geometryTriangles?.concepts.join(' ')).toContain('top editor')
    expect(geometryTriangles?.concepts.join(' ')).toContain('solve-missing')
    expect(geometrySolids?.concepts.join(' ')).toContain('top editor')
    expect(geometryCoordinate?.concepts.join(' ')).toContain('one unknown coordinate')
  })

  it('keeps statistics guidance aligned with the shared statistics core', () => {
    const descriptive = getGuideArticle('statistics-descriptive')
    const inference = getGuideArticle('statistics-inference')
    const probability = getGuideArticle('statistics-probability')
    const regression = getGuideArticle('statistics-regression')

    expect(descriptive?.concepts.join(' ')).toContain('top Statistics editor')
    expect(inference?.summary).toContain('one-sample mean')
    expect(inference?.examples[0]?.launch.statisticsScreen).toBe('meanInference')
    expect(probability?.summary).toContain('bounded binomial')
    expect(probability?.examples[0]?.launch.statisticsScreen).toBe('binomial')
    expect(regression?.summary).toContain('linear regression')
    expect(regression?.summary).toContain('quality summaries')
    expect(regression?.concepts.join(' ')).toContain('SSE')
    expect(regression?.pitfalls.join(' ')).toContain('causation')
    expect(regression?.examples[0]?.launch.statisticsScreen).toBe('regression')
    expect(getGuideModeRef('statistics')?.articleIds).toContain('statistics-inference')
  })
})
