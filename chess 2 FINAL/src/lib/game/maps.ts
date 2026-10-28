export interface MapData {
  name: string;
  w: number;
  h: number;
  land: number[];
  spawns: number[];
}

export interface MapPreset {
  id: string;
  name: string;
  blurb: string;
  maxPlayers: number;
}

export const MAP_PRESETS: MapPreset[] = [
  { id: "pangaea", name: "Pangaea", blurb: "One giant landmass. Nowhere to hide.", maxPlayers: 8 },
  { id: "atlas", name: "Doodle Earth", blurb: "The whole scribbled world. Big oceans, fat continents.", maxPlayers: 8 },
  { id: "archipelago", name: "Archipelago", blurb: "Islands everywhere. Harbors and boats rule.", maxPlayers: 6 },
  { id: "arena", name: "Crayon Arena", blurb: "Tight symmetrical brawl. Fast games.", maxPlayers: 4 },
  { id: "lakes", name: "Inkblot Lakes", blurb: "Continent chopped up by wobbly lakes.", maxPlayers: 6 },
];

const ATLAS_ROWS = [
  "...#######..........#####..###########..",
  "..##########.......#######.############.",
  "..###########......########.###########.",
  "...#########.......#######..###########.",
  "....########........####.....##########.",
  ".....######..........###......########..",
  "......####...........####......######...",
  ".......##.............####......####....",
  "........#.............#####......##.....",
  ".......###............######....###.....",
  "........####..........######...####.....",
  ".........####.........######..#####.....",
  ".........#####........#####....###......",
  "..........####........#####.....##......",
  "..........####........####.......#......",
  "..........####........###.....######....",
  "..........###.........##.....########...",
  "..........###................#######....",
  "..........##.................######.....",
  "...........#..................####......",
  "..............................###.......",
  "........................................",
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blank(w: number, h: number) {
  return new Array<number>(w * h).fill(0);
}

function blob(
  land: number[],
  w: number,
  h: number,
  cx: number,
  cy: number,
  size: number,
  rnd: () => number,
) {
  let cells: Array<[number, number]> = [[cx, cy]];
  const seen = new Set<string>([`${cx},${cy}`]);
  let guard = 0;
  while (cells.length < size && guard < size * 40) {
    guard++;
    const [x, y] = cells[Math.floor(rnd() * cells.length)];
    const dx = [1, -1, 0, 0][Math.floor(rnd() * 4)];
    const dy = dx === 0 ? (rnd() < 0.5 ? 1 : -1) : 0;
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
    const key = `${nx},${ny}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push([nx, ny]);
  }
  cells = cells.filter(Boolean);
  for (const [x, y] of cells) land[y * w + x] = 1;
}

function smooth(land: number[], w: number, h: number) {
  const out = land.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          n += land[(y + dy) * w + (x + dx)];
        }
      }
      const i = y * w + x;
      if (land[i] === 1 && n <= 1) out[i] = 0;
      if (land[i] === 0 && n >= 6) out[i] = 1;
    }
  }
  return out;
}

/** Farthest-point sampling so capitals start far apart. */
export function pickSpawns(
  land: number[],
  w: number,
  h: number,
  count: number,
  seed = 7,
): number[] {
  const rnd = mulberry32(seed);
  const candidates: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (land[i] !== 1) continue;
      let ring = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) ring += land[(y + dy) * w + (x + dx)] ?? 0;
      }
      if (ring >= 7) candidates.push(i);
    }
  }
  if (candidates.length === 0) {
    for (let i = 0; i < land.length; i++) if (land[i] === 1) candidates.push(i);
  }
  if (candidates.length === 0) {
    return [0];
  }
  const spawns: number[] = [candidates[Math.floor(rnd() * candidates.length)]];
  while (spawns.length < count && candidates.length > 0) {
    let best = candidates[0];
    let bestDist = -1;
    for (const c of candidates) {
      const cx = c % w;
      const cy = Math.floor(c / w);
      let d = Infinity;
      for (const s of spawns) {
        const sx = s % w;
        const sy = Math.floor(s / w);
        d = Math.min(d, Math.abs(cx - sx) + Math.abs(cy - sy));
      }
      if (d > bestDist) {
        bestDist = d;
        best = c;
      }
    }
    spawns.push(best);
  }
  return spawns;
}

export function buildMap(preset: string, players: number, seed = Date.now() % 100000): MapData {
  const rnd = mulberry32(seed);
  if (preset === "atlas") {
    const w = 40;
    const h = ATLAS_ROWS.length;
    const land = blank(w, h);
    ATLAS_ROWS.forEach((row, y) => {
      for (let x = 0; x < w; x++) land[y * w + x] = row[x] === "#" ? 1 : 0;
    });
    return { name: "Doodle Earth", w, h, land, spawns: pickSpawns(land, w, h, players, seed) };
  }
  if (preset === "archipelago") {
    const w = 32;
    const h = 22;
    let land = blank(w, h);
    const isles = 7 + Math.floor(rnd() * 4);
    for (let i = 0; i < isles; i++) {
      blob(
        land,
        w,
        h,
        3 + Math.floor(rnd() * (w - 6)),
        2 + Math.floor(rnd() * (h - 4)),
        24 + Math.floor(rnd() * 34),
        rnd,
      );
    }
    land = smooth(land, w, h);
    return { name: "Archipelago", w, h, land, spawns: pickSpawns(land, w, h, players, seed) };
  }
  if (preset === "arena") {
    const w = 20;
    const h = 16;
    const land = blank(w, h);
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const edge = Math.abs(x - (w - 1) / 2) / (w / 2) + Math.abs(y - (h - 1) / 2) / (h / 2);
        if (edge < 0.95) land[y * w + x] = 1;
      }
    }
    for (let i = 0; i < 10; i++) {
      const x = 4 + Math.floor(rnd() * (w - 8));
      const y = 4 + Math.floor(rnd() * (h - 8));
      land[y * w + x] = 0;
    }
    return { name: "Crayon Arena", w, h, land, spawns: pickSpawns(land, w, h, players, seed) };
  }
  if (preset === "lakes") {
    const w = 30;
    const h = 20;
    let land = blank(w, h);
    blob(land, w, h, Math.floor(w / 2), Math.floor(h / 2), Math.floor(w * h * 0.62), rnd);
    land = smooth(land, w, h);
    for (let i = 0; i < 9; i++) {
      const lake = blank(w, h);
      blob(
        lake,
        w,
        h,
        2 + Math.floor(rnd() * (w - 4)),
        2 + Math.floor(rnd() * (h - 4)),
        6 + Math.floor(rnd() * 12),
        rnd,
      );
      for (let j = 0; j < land.length; j++) if (lake[j]) land[j] = 0;
    }
    return { name: "Inkblot Lakes", w, h, land, spawns: pickSpawns(land, w, h, players, seed) };
  }
  // pangaea default
  const w = 30;
  const h = 20;
  let land = blank(w, h);
  blob(land, w, h, Math.floor(w / 2), Math.floor(h / 2), Math.floor(w * h * 0.6), rnd);
  for (let i = 0; i < 3; i++) {
    blob(land, w, h, 3 + Math.floor(rnd() * (w - 6)), 2 + Math.floor(rnd() * (h - 4)), 20, rnd);
  }
  land = smooth(land, w, h);
  land = smooth(land, w, h);
  return { name: "Pangaea", w, h, land, spawns: pickSpawns(land, w, h, players, seed) };
}

export function mapFromTiles(
  name: string,
  w: number,
  h: number,
  tiles: string,
  spawns: number[],
  players: number,
): MapData {
  const land = blank(w, h);
  for (let i = 0; i < w * h; i++) land[i] = tiles[i] === "#" ? 1 : 0;
  const useSpawns =
    spawns.length >= players ? spawns.slice(0, players) : pickSpawns(land, w, h, players, 11);
  return { name, w, h, land, spawns: useSpawns };
}
