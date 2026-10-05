// The map is a grid of 24x24 plots. A run starts with only the plot round the core explored; after every win the player
// chooses one neighbouring plot to open and the game opens a second, random one. What lies in each plot depends on how far
// it is from the core (its "ring"), so new resources arrive slowly: iron first, then copper, coal and tin, lead and sulfur...
export const PLOT = 24;
export const PLOT_X0 = 16;
export const PLOT_Y0 = 16;
export const PLOT_COLS = 7;
export const PLOT_ROWS = 7;
export const CORE_PLOT = { i: 3, j: 3 };
export const CORE_PLOT_ID = CORE_PLOT.j * PLOT_COLS + CORE_PLOT.i;

export interface Rect { x0: number; y0: number; x1: number; y1: number }

export const plotCol = (id: number): number => id % PLOT_COLS;
export const plotRow = (id: number): number => Math.floor(id / PLOT_COLS);

/** The plot a tile belongs to, or -1 outside the grid. */
export function plotIdAt(x: number, y: number): number {
  const i = Math.floor((x - PLOT_X0) / PLOT), j = Math.floor((y - PLOT_Y0) / PLOT);
  return i < 0 || j < 0 || i >= PLOT_COLS || j >= PLOT_ROWS ? -1 : j * PLOT_COLS + i;
}

export function plotRect(id: number): Rect {
  const x0 = PLOT_X0 + plotCol(id) * PLOT, y0 = PLOT_Y0 + plotRow(id) * PLOT;
  return { x0, y0, x1: x0 + PLOT, y1: y0 + PLOT };
}

export const plotCentre = (id: number): { x: number; y: number } => { const r = plotRect(id); return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; };
/** Like a chess square: column letter, row number. */
export const plotLabel = (id: number): string => `${'ABCDEFG'[plotCol(id)]}${plotRow(id) + 1}`;
/** How many plots away from the core's plot (1 = next door, diagonals included). */
export const plotRing = (id: number): number => Math.max(Math.abs(plotCol(id) - CORE_PLOT.i), Math.abs(plotRow(id) - CORE_PLOT.j));

const SIDES: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const neighbour = (id: number, dx: number, dy: number): number => {
  const i = plotCol(id) + dx, j = plotRow(id) + dy;
  return i < 0 || j < 0 || i >= PLOT_COLS || j >= PLOT_ROWS ? -1 : j * PLOT_COLS + i;
};

/** Locked plots that touch an opened plot (up, down, left or right): the ones that can be opened next. */
export function plotCandidates(open: ReadonlySet<number>): number[] {
  const out = new Set<number>();
  for (const id of open) for (const [dx, dy] of SIDES) { const n = neighbour(id, dx, dy); if (n >= 0 && !open.has(n)) out.add(n); }
  return [...out].sort((a, b) => a - b);
}

/**
 * Orders squares for offering: nearest the core first (by ring), shuffled only among squares in the same ring by `rnd`,
 * so the explored land fills in from the middle outward and does not leave big gaps.
 */
export function nearestFirst(ids: readonly number[], rnd: (id: number) => number): number[] {
  return [...ids].sort((a, b) => plotRing(a) - plotRing(b) || rnd(a) - rnd(b));
}

/** The edges of the opened land that face unexplored ground or the map's end: where enemies come in. */
export function exposedEdges(open: ReadonlySet<number>): (Rect & { side: number })[] {
  const out: (Rect & { side: number })[] = [];
  for (const id of open) {
    const r = plotRect(id);
    SIDES.forEach(([dx, dy], side) => {
      const n = neighbour(id, dx, dy);
      if (n >= 0 && open.has(n)) return;
      out.push(side === 0 ? { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y0, side } : side === 1 ? { x0: r.x1, y0: r.y0, x1: r.x1, y1: r.y1, side }
        : side === 2 ? { x0: r.x0, y0: r.y1, x1: r.x1, y1: r.y1, side } : { x0: r.x0, y0: r.y0, x1: r.x0, y1: r.y1, side });
    });
  }
  return out;
}

export function plotsBounds(open: ReadonlySet<number>): Rect {
  let b: Rect | null = null;
  for (const id of open) {
    const r = plotRect(id);
    b = b ? { x0: Math.min(b.x0, r.x0), y0: Math.min(b.y0, r.y0), x1: Math.max(b.x1, r.x1), y1: Math.max(b.y1, r.y1) } : r;
  }
  return b ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
}
