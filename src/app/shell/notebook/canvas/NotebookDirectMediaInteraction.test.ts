import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_MEDIA_RESIZE_HANDLES,
  resizeNotebookMediaRectangle,
} from './NotebookDirectMediaInteraction';

const constraints = {
  maximumHeight: 900,
  maximumWidth: 1200,
  minimumSize: 36,
};

describe('Notebook direct media resize geometry', () => {
  it('keeps image corners proportional while side handles change one dimension', () => {
    const corner = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'south-east',
      height: 300,
      movementX: 200,
      movementY: 30,
      width: 600,
    });
    const east = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'east',
      height: 300,
      movementX: 200,
      movementY: 0,
      width: 600,
    });
    const south = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'south',
      height: 300,
      movementX: 0,
      movementY: 100,
      width: 600,
    });

    expect(corner).toEqual({ width: 800, height: 400 });
    expect(east).toEqual({ width: 800, height: 300 });
    expect(south).toEqual({ width: 600, height: 400 });
  });

  it.each(NOTEBOOK_MEDIA_RESIZE_HANDLES.map(({ value }) => value))(
    'preserves a video source ratio from the %s handle',
    (handle) => {
      const resized = resizeNotebookMediaRectangle({
        ...constraints,
        handle,
        height: 360,
        lockedAspectRatio: 16 / 9,
        movementX: handle.includes('west') ? 120 : 180,
        movementY: handle.includes('north') ? 80 : 120,
        width: 640,
      });
      expect(resized.width / resized.height).toBeCloseTo(16 / 9, 8);
    },
  );

  it('clamps proportional media to the minimum and usable page bounds', () => {
    const minimum = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'north-west',
      height: 360,
      lockedAspectRatio: 16 / 9,
      movementX: -2_000,
      movementY: -2_000,
      width: 640,
    });
    const maximum = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'south-east',
      height: 360,
      lockedAspectRatio: 16 / 9,
      movementX: 2_000,
      movementY: 2_000,
      width: 640,
    });

    expect(minimum).toEqual({ width: 64, height: 36 });
    expect(maximum.width).toBeLessThanOrEqual(1200);
    expect(maximum.height).toBeLessThanOrEqual(900);
    expect(maximum.width / maximum.height).toBeCloseTo(16 / 9, 8);
  });
});
