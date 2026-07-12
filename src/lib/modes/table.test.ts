import { describe, expect, it, vi } from 'vitest'
import type { OoeRuntimeControlContext } from '../ooe/runtime-control/runtime-coordinator'
import {
  buildTableOoeInputRevisionId,
  buildTableOoeSnapshot,
  runTableMode,
  runTableModeCooperatively,
  type RunTableModeRequest,
} from './table'
import {
  runTableModeViaIsolatedWorker,
} from './worker-clients/table-worker-client'
import type {
  TableWorkerInboundMessage,
  TableWorkerOutboundMessage,
} from './worker-entrypoints/table.worker'

class FakeTableWorker {
  readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

  private readonly onPost?: (
    worker: FakeTableWorker,
    message: TableWorkerInboundMessage,
  ) => void

  readonly postMessage = vi.fn((message: TableWorkerInboundMessage) => {
    this.onPost?.(this, message)
  })

  readonly terminate = vi.fn()

  constructor(onPost?: (
    worker: FakeTableWorker,
    message: TableWorkerInboundMessage,
  ) => void) {
    this.onPost = onPost
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)?.add(listener)
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.get(type)?.delete(listener)
  }

  emitMessage(data: TableWorkerOutboundMessage) {
    const event = new MessageEvent('message', { data })
    for (const listener of this.listeners.get('message') ?? []) {
      if (typeof listener === 'function') {
        listener(event)
      } else {
        listener.handleEvent(event)
      }
    }
  }
}

function tableWorkerContext(input: {
  shouldCancel?: () => boolean
  checkpoints?: string[]
} = {}): OoeRuntimeControlContext {
  return {
    registryId: 'ooe-job-test',
    shouldCancel: input.shouldCancel ?? (() => false),
    checkpoint: (message) => input.checkpoints?.push(message),
    yieldIfBudgetExceeded: async () => true,
  }
}

describe('Table OOE snapshot helpers', () => {
  const baseRequest: RunTableModeRequest = {
    primaryLatex: 'a x^2+x',
    secondaryLatex: 'k+x',
    secondaryEnabled: true,
    start: 1,
    end: 2,
    step: 1,
    storedVariables: [
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ],
    variableSubstitutionSnapshot: [
      { name: 'a', valueLatex: '3', numericValue: 3 },
    ],
  }

  it('builds stable snapshots and revisions for equivalent requests', () => {
    const equivalentRequest: RunTableModeRequest = {
      step: 1,
      end: 2,
      start: 1,
      secondaryEnabled: true,
      secondaryLatex: 'k+x',
      primaryLatex: 'a x^2+x',
      variableSubstitutionSnapshot: [
        { numericValue: 3, valueLatex: '3', name: 'a' },
      ],
      storedVariables: [
        { numericValue: 4, valueLatex: '4', name: 'a' },
        { numericValue: -2, valueLatex: '-2', name: 'k' },
      ],
    }

    expect(buildTableOoeSnapshot(baseRequest)).toEqual({
      request: baseRequest,
    })
    expect(buildTableOoeInputRevisionId(baseRequest)).toBe(
      buildTableOoeInputRevisionId(equivalentRequest),
    )
    expect(buildTableOoeInputRevisionId(baseRequest)).toMatch(
      /^input\.table\.build\.[a-z0-9]+$/u,
    )
  })

  it('changes revisions when table inputs change meaningfully', () => {
    const baseRevision = buildTableOoeInputRevisionId(baseRequest)

    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      primaryLatex: 'a x^3+x',
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      end: 3,
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      step: 0.5,
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      storedVariables: [
        { name: 'a', valueLatex: '5', numericValue: 5 },
        { name: 'k', valueLatex: '-2', numericValue: -2 },
      ],
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      variableSubstitutionSnapshot: [
        { name: 'a', valueLatex: '6', numericValue: 6 },
      ],
    })).not.toBe(baseRevision)
  })
})

describe('runTableMode', () => {
  it('builds a table for a valid range', () => {
    const result = runTableMode({
      primaryLatex: 'x^2',
      secondaryLatex: 'x+1',
      secondaryEnabled: true,
      start: -2,
      end: 2,
      step: 1,
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toHaveLength(5)
    expect(result.response.headers).toEqual(['x', 'x^2', 'x+1'])
  })

  it('cooperative table completion matches the synchronous table result', async () => {
    const request: RunTableModeRequest = {
      primaryLatex: 'a x^2+x',
      secondaryLatex: 'k+x',
      secondaryEnabled: true,
      start: 1,
      end: 2,
      step: 1,
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'k', valueLatex: '-2', numericValue: -2 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    }

    await expect(runTableModeCooperatively(request, {
      rowsPerBatch: 1,
      yieldIfBudgetExceeded: async () => undefined,
    })).resolves.toEqual(runTableMode(request))
  })

  it('cooperative table builds can stop before returning partial rows', async () => {
    const result = await runTableModeCooperatively({
      primaryLatex: 'x^2',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: 1,
      end: 40,
      step: 1,
    }, {
      rowsPerBatch: 5,
      shouldCancel: () => true,
    })

    expect(result.runtimeStatus).toBe('cancelled')
    expect(result.response.rows).toEqual([])
    expect(result.outcome.kind).toBe('error')
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected a cancellation note')
    }
    expect(result.outcome.error).toBe('Table build was stopped before it finished.')
    expect(result.outcome.canonicalResult).toBeUndefined()
  })

  it('isolated worker table completion matches the synchronous table result', async () => {
    const request: RunTableModeRequest = {
      primaryLatex: 'a x^2+x',
      secondaryLatex: 'k+x',
      secondaryEnabled: true,
      start: 1,
      end: 2,
      step: 1,
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'k', valueLatex: '-2', numericValue: -2 },
      ],
    }
    const worker = new FakeTableWorker((fakeWorker, message) => {
      fakeWorker.emitMessage({
        kind: 'completed',
        requestId: message.requestId,
        payload: runTableMode(message.request),
      })
    })

    const result = await runTableModeViaIsolatedWorker(
      request,
      tableWorkerContext(),
      {
        createWorker: () => worker as unknown as Worker,
        fallback: async () => runTableModeCooperatively(request),
      },
    )

    expect(result.payload).toEqual(runTableMode(request))
    expect(result.hostExecution).toEqual({
      kind: 'worker',
      hostId: 'table-worker-runtime',
      isolated: true,
    })
    expect(worker.terminate).not.toHaveBeenCalled()
    expect(worker.listeners.get('message')?.size).toBe(0)
    expect(worker.listeners.get('error')?.size).toBe(0)
  })

  it('isolated worker cancellation terminates the worker and returns the controlled note', async () => {
    let cancelled = false
    const checkpoints: string[] = []
    const request: RunTableModeRequest = {
      primaryLatex: 'x^2',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: 1,
      end: 40,
      step: 1,
    }
    const worker = new FakeTableWorker()

    const pending = runTableModeViaIsolatedWorker(
      request,
      tableWorkerContext({
        checkpoints,
        shouldCancel: () => cancelled,
      }),
      {
        createWorker: () => worker as unknown as Worker,
        fallback: async () => runTableModeCooperatively(request),
      },
    )

    cancelled = true
    const result = await pending

    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(checkpoints).toContain('Table worker runtime was terminated after a Stop request.')
    expect(result.hostExecution).toEqual({
      kind: 'worker-cancelled',
      hostId: 'table-worker-runtime',
      isolated: true,
      termination: 'hardStop',
    })
    expect(result.payload.runtimeStatus).toBe('cancelled')
    expect(result.payload.response.rows).toEqual([])
    expect(result.payload.outcome).toMatchObject({
      kind: 'error',
      title: 'Table',
      error: 'Table build was stopped before it finished.',
    })
  })

  it('falls back to cooperative main-thread table when the worker is unavailable', async () => {
    const checkpoints: string[] = []
    const request: RunTableModeRequest = {
      primaryLatex: 'x^2',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -1,
      end: 1,
      step: 1,
    }

    const result = await runTableModeViaIsolatedWorker(
      request,
      tableWorkerContext({ checkpoints }),
      {
        createWorker: () => {
          throw new Error('workers disabled')
        },
        fallback: async () => runTableModeCooperatively(request),
      },
    )

    expect(result.payload).toEqual(runTableMode(request))
    expect(result.hostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'table-runtime',
      isolated: false,
      fallbackFromHostId: 'table-worker-runtime',
    })
    if (result.hostExecution.kind !== 'fallback') {
      throw new Error('Expected worker fallback metadata')
    }
    expect(result.hostExecution.reason).toContain('worker-initialization-failed')
    expect(checkpoints[0]).toContain('falling back to main-thread Table runtime')
  })

  it('falls back without exposing partial rows when the worker runtime reports failure', async () => {
    const checkpoints: string[] = []
    const request: RunTableModeRequest = {
      primaryLatex: 'x^2',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -1,
      end: 1,
      step: 1,
    }
    const worker = new FakeTableWorker((fakeWorker, message) => {
      fakeWorker.emitMessage({
        kind: 'failed',
        requestId: message.requestId,
        message: 'worker exploded',
      })
    })

    const result = await runTableModeViaIsolatedWorker(
      request,
      tableWorkerContext({ checkpoints }),
      {
        createWorker: () => worker as unknown as Worker,
        fallback: async () => runTableModeCooperatively(request),
      },
    )

    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(result.payload).toEqual(runTableMode(request))
    expect(result.hostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'table-runtime',
      fallbackFromHostId: 'table-worker-runtime',
      reason: 'worker-runtime-failed: worker exploded',
    })
    expect(JSON.stringify(result.payload)).not.toContain('partial')
    expect(checkpoints[0]).toBe('Table worker runtime started.')
    expect(checkpoints[1]).toContain('falling back to main-thread Table runtime')
  })

  it('rejects invalid step sizes', () => {
    const result = runTableMode({
      primaryLatex: 'x^2',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -2,
      end: 2,
      step: 0,
    })

    expect(result.outcome.kind).toBe('error')
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected an error outcome')
    }
    expect(result.outcome.error).toBe('Step size must be greater than zero.')
  })

  it('keeps the table when some sampled rows leave the real domain', () => {
    const result = runTableMode({
      primaryLatex: '\\sqrt{x}',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -1,
      end: 1,
      step: 1,
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toEqual([
      { x: '-1', primary: 'undefined', secondary: undefined },
      { x: '0', primary: '0', secondary: undefined },
      { x: '1', primary: '1', secondary: undefined },
    ])
    expect(result.response.warnings).toContain(
      'Some sampled rows were outside the real domain and are shown as undefined.',
    )
    expect(result.outcome.kind).toBe('success')
    if (result.outcome.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.outcome.detailSections?.[0]?.title).toBe('Domain Facts')
    expect(result.outcome.detailSections?.[1]?.title).toBe('Interval Safety')
    expect(result.outcome.detailSections?.[1]?.lines.join(' ')).toContain('1 sampled table row')
  })

  it('substitutes stored non-active variables without replacing x', () => {
    const result = runTableMode({
      primaryLatex: 'a x^2+x',
      secondaryLatex: 'k+x',
      secondaryEnabled: true,
      start: 1,
      end: 2,
      step: 1,
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'k', valueLatex: '-2', numericValue: -2 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toEqual([
      { x: '1', primary: '5', secondary: '-1' },
      { x: '2', primary: '18', secondary: '0' },
    ])
    expect(result.outcome.kind).toBe('success')
    if (result.outcome.kind !== 'success') {
      throw new Error('Expected success')
    }
    expect(result.outcome.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ])
    expect(result.outcome.detailSections?.[0]).toMatchObject({
      title: 'Stored Values',
      lines: [
        'Used stored values: a=4, k=-2.',
        'Effective table expression: f(x)=4x^2+x,\\;g(x)=x-2.',
      ],
    })
    expect(result.outcome.detailSections?.[1]).toMatchObject({
      title: 'Variable Policy',
      lines: ['Kept x symbolic as the table variable.'],
    })
    expect(result.outcome.exactLatex).toContain('x')
    expect(result.outcome.exactLatex).not.toContain('9')
  })

  it('substitutes explicit named table parameters under the existing table policy', () => {
    const result = runTableMode({
      primaryLatex: '@rate x',
      secondaryLatex: 'var(offset)+x',
      secondaryEnabled: true,
      start: 1,
      end: 2,
      step: 1,
      storedVariables: [
        { name: 'rate', valueLatex: '4', numericValue: 4 },
        { name: 'offset', valueLatex: '-2', numericValue: -2 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toEqual([
      { x: '1', primary: '4', secondary: '-1' },
      { x: '2', primary: '8', secondary: '0' },
    ])
    expect(result.outcome.kind).toBe('success')
    if (result.outcome.kind !== 'success') {
      throw new Error('Expected success')
    }
    expect(result.outcome.variableSubstitutions).toEqual([
      { name: 'rate', valueLatex: '4', numericValue: 4 },
      { name: 'offset', valueLatex: '-2', numericValue: -2 },
    ])
    expect(result.outcome.detailSections?.[0]?.lines[0]).toBe(
      'Used stored values: rate=4, offset=-2.',
    )
  })
})
