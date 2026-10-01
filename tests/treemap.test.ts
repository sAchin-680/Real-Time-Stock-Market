import { describe, expect, it } from 'vitest';
import { squarify } from '@/lib/finance/treemap';

describe('squarify', () => {
  const bounds = { x: 0, y: 0, w: 600, h: 400 };

  it('tiles fill the bounds with areas proportional to value', () => {
    const tiles = squarify([{ value: 6 }, { value: 6 }, { value: 4 }, { value: 3 }, { value: 2 }, { value: 2 }, { value: 1 }], bounds);
    const area = tiles.reduce((s, t) => s + t.w * t.h, 0);
    expect(area).toBeCloseTo(600 * 400, 3);
    expect(tiles[0].w * tiles[0].h).toBeCloseTo((6 / 24) * 240000, 3);
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(-1e-6);
      expect(t.y).toBeGreaterThanOrEqual(-1e-6);
      expect(t.x + t.w).toBeLessThanOrEqual(600 + 1e-6);
      expect(t.y + t.h).toBeLessThanOrEqual(400 + 1e-6);
    }
  });

  it('keeps tiles reasonably square', () => {
    const tiles = squarify(Array.from({ length: 12 }, (_, i) => ({ value: 12 - i })), bounds);
    const worst = Math.max(...tiles.map((t) => Math.max(t.w / t.h, t.h / t.w)));
    expect(worst).toBeLessThan(4);
  });

  it('ignores zero/negative values and empty input', () => {
    expect(squarify([], bounds)).toEqual([]);
    expect(squarify([{ value: 0 }, { value: -1 }], bounds)).toEqual([]);
    expect(squarify([{ value: 1 }], bounds)[0]).toMatchObject({ x: 0, y: 0, w: 600, h: 400 });
  });
});
