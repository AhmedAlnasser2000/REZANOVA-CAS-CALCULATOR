import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_MEDIA_RESIZE_HANDLES,
  fitNotebookRotatedMediaFrame,
  resizeNotebookMediaRectangle,
} from './NotebookDirectMediaInteraction';

const constraints = {
  maximumHeight: 900,
  maximumWidth: 1200,
  minimumSize: 36,
};

const rectangle = {
  left: 100,
  top: 200,
  right: 700,
  bottom: 500,
  width: 600,
  height: 300,
};

describe('Notebook direct media resize geometry', () => {
  it('keeps image corners proportional while side handles change one dimension', () => {
    const corner = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'south-east',
      movementX: 200,
      movementY: 30,
      rectangle,
    });
    const east = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'east',
      movementX: 200,
      movementY: 0,
      rectangle,
    });
    const south = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'south',
      movementX: 0,
      movementY: 100,
      rectangle,
    });

    expect(corner).toEqual({ left: 100, top: 200, right: 900, bottom: 600, width: 800, height: 400 });
    expect(east).toEqual({ left: 100, top: 200, right: 900, bottom: 500, width: 800, height: 300 });
    expect(south).toEqual({ left: 100, top: 200, right: 700, bottom: 600, width: 600, height: 400 });
  });

  it.each(NOTEBOOK_MEDIA_RESIZE_HANDLES.map(({ value }) => value))(
    'preserves a video source ratio from the %s handle',
    (handle) => {
      const resized = resizeNotebookMediaRectangle({
        ...constraints,
        handle,
        lockedAspectRatio: 16 / 9,
        movementX: handle.includes('west') ? 120 : 180,
        movementY: handle.includes('north') ? 80 : 120,
        rectangle: { left: 100, top: 200, right: 740, bottom: 560, width: 640, height: 360 },
      });
      expect(resized.width / resized.height).toBeCloseTo(16 / 9, 8);
    },
  );

  it('clamps proportional media to the minimum and usable page bounds', () => {
    const minimum = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'north-west',
      lockedAspectRatio: 16 / 9,
      movementX: 2_000,
      movementY: 2_000,
      rectangle: { left: 100, top: 200, right: 740, bottom: 560, width: 640, height: 360 },
    });
    const maximum = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'south-east',
      lockedAspectRatio: 16 / 9,
      movementX: 2_000,
      movementY: 2_000,
      rectangle: { left: 100, top: 200, right: 740, bottom: 560, width: 640, height: 360 },
    });

    expect(minimum).toEqual({ left: 676, top: 524, right: 740, bottom: 560, width: 64, height: 36 });
    expect(maximum.width).toBeLessThanOrEqual(1200);
    expect(maximum.height).toBeLessThanOrEqual(900);
    expect(maximum.width / maximum.height).toBeCloseTo(16 / 9, 8);
  });

  it('keeps a west handle on the pointer and fits rotated bounds inside the page', () => {
    const resized = resizeNotebookMediaRectangle({
      ...constraints,
      handle: 'west',
      movementX: -73.4,
      movementY: 0,
      rectangle,
    });
    expect(resized.left).toBeCloseTo(rectangle.left - 73.4, 8);
    expect(resized.right).toBe(rectangle.right);

    const fitted = fitNotebookRotatedMediaFrame(800, 400, 45, 600, 700);
    const radians = Math.PI / 4;
    const renderedWidth = fitted.width * Math.cos(radians) + fitted.height * Math.sin(radians);
    const renderedHeight = fitted.width * Math.sin(radians) + fitted.height * Math.cos(radians);
    expect(renderedWidth).toBeLessThanOrEqual(600.000_001);
    expect(renderedHeight).toBeLessThanOrEqual(700.000_001);
  });
});
