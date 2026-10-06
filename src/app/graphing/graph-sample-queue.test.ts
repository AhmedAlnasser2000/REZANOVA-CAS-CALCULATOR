import { describe, expect, it } from 'vitest';
import { enqueueGraphSample, graphSampleInputKeys, type GraphQueuedSample } from './graph-sample-queue';

const sample = (quality: GraphQueuedSample<string>['quality'], mathematics: number, viewport = 1, parameter = 1, width = 800): GraphQueuedSample<string> => ({
  quality, snapshot: `${quality}@${mathematics}.${viewport}.${parameter}`, ...graphSampleInputKeys({ mathematics, viewport, parameter }, width, 600),
});

describe('graph sample queue', () => {
  it('runs the newest input preview before its settled pass instead of letting the settled pass replace it', () => {
    const inFlight = sample('settled', 1);
    const first = enqueueGraphSample([], inFlight, sample('preview', 2));
    const second = enqueueGraphSample(first.queue, inFlight, sample('settled', 2));
    expect(second.queue.map((entry) => entry.snapshot)).toEqual(['preview@2.1.1', 'settled@2.1.1']);
    expect(first.supersede && second.supersede).toBe(true);
  });

  it('drops waiting work for older inputs and duplicates of the same quality', () => {
    const inFlight = sample('preview', 1);
    let { queue } = enqueueGraphSample([], inFlight, sample('settled', 2));
    ({ queue } = enqueueGraphSample(queue, inFlight, sample('preview', 3)));
    ({ queue } = enqueueGraphSample(queue, inFlight, sample('preview', 3)));
    expect(queue.map((entry) => entry.snapshot)).toEqual(['preview@3.1.1']);
  });

  it('drops a request the run in flight already covers at the same or a better quality', () => {
    expect(enqueueGraphSample([], sample('settled', 4), sample('settled', 4)).queue).toEqual([]);
    expect(enqueueGraphSample([], sample('settled', 4), sample('preview', 4)).queue).toEqual([]);
    expect(enqueueGraphSample([], sample('preview', 4), sample('settled', 4)).queue.map((entry) => entry.quality)).toEqual(['settled']);
    // A resize is a new input even at the same revisions.
    expect(enqueueGraphSample([], sample('settled', 4), sample('settled', 4, 1, 1, 900)).queue).toHaveLength(1);
  });

  it('stops stale refinement and stale-document previews, but lets view and slider previews finish', () => {
    expect(enqueueGraphSample([], sample('polish', 1), sample('preview', 1, 2)).supersede).toBe(true);
    expect(enqueueGraphSample([], sample('preview', 1), sample('preview', 2)).supersede).toBe(true);
    expect(enqueueGraphSample([], sample('preview', 1), sample('preview', 1, 2)).supersede).toBe(false);
    expect(enqueueGraphSample([], sample('preview', 1), sample('preview', 1, 1, 2)).supersede).toBe(false);
    expect(enqueueGraphSample([], sample('settled', 1), sample('settled', 1)).supersede).toBe(false);
  });
});
