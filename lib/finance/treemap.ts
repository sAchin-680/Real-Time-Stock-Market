export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Squarified treemap (Bruls, Huizing & van Wijk). Lays out items with area
 * proportional to `value`, keeping tiles as close to square as possible.
 * Returns tiles in the same coordinate space as `bounds`.
 */
export function squarify<T extends { value: number }>(items: readonly T[], bounds: Rect): (T & Rect)[] {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  if (!(total > 0) || bounds.w <= 0 || bounds.h <= 0) return [];

  const scale = (bounds.w * bounds.h) / total;
  const queue = [...items]
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => ({ item, area: item.value * scale }));

  const out: (T & Rect)[] = [];
  let free: Rect = { ...bounds };

  const worst = (row: number[], side: number) => {
    const sum = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    const s2 = side * side;
    const sum2 = sum * sum;
    return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
  };

  const layoutRow = (row: { item: T; area: number }[]) => {
    const sum = row.reduce((s, r) => s + r.area, 0);
    const horizontal = free.w >= free.h; // lay the row along the shorter side
    if (horizontal) {
      const colW = sum / free.h;
      let y = free.y;
      for (const r of row) {
        const h = r.area / colW;
        out.push({ ...r.item, x: free.x, y, w: colW, h });
        y += h;
      }
      free = { x: free.x + colW, y: free.y, w: free.w - colW, h: free.h };
    } else {
      const rowH = sum / free.w;
      let x = free.x;
      for (const r of row) {
        const w = r.area / rowH;
        out.push({ ...r.item, x, y: free.y, w, h: rowH });
        x += w;
      }
      free = { x: free.x, y: free.y + rowH, w: free.w, h: free.h - rowH };
    }
  };

  let row: { item: T; area: number }[] = [];
  while (queue.length) {
    const next = queue[0];
    const side = Math.min(free.w, free.h);
    const current = row.map((r) => r.area);
    if (!row.length || worst(current, side) >= worst([...current, next.area], side)) {
      row.push(queue.shift()!);
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length) layoutRow(row);
  return out;
}
