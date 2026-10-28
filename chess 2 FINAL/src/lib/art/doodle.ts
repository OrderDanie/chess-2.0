import { PieceKind } from "../../types";

export type P = [number, number];
export const INK = "#2b2118";
export const PAPER = "#fdf3dc";

export function makeRnd(seed: number) {
  let a = (seed | 0) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StrokeOpts {
  fill?: string;
  stroke?: string;
  width?: number;
  close?: boolean;
  amp?: number;
  passes?: number;
  step?: number;
}

/** A tiny hand-drawn renderer: everything comes out wobbly, nothing is straight. */
export class Sketch {
  ctx: CanvasRenderingContext2D;
  rnd: () => number;

  constructor(ctx: CanvasRenderingContext2D, seed = 7) {
    this.ctx = ctx;
    this.rnd = makeRnd(seed);
  }

  reseed(seed: number) {
    this.rnd = makeRnd(seed);
  }

  private wobble(pts: P[], amp: number, step: number, close: boolean): P[] {
    const out: P[] = [];
    const n = pts.length;
    const last = close ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      const segs = Math.max(1, Math.round(len / step));
      for (let k = 0; k < segs; k++) {
        const t = k / segs;
        out.push([
          a[0] + dx * t + (this.rnd() - 0.5) * amp,
          a[1] + dy * t + (this.rnd() - 0.5) * amp,
        ]);
      }
    }
    if (!close && pts.length > 0) {
      const b = pts[n - 1];
      out.push([
        b[0] + (this.rnd() - 0.5) * amp * 0.4,
        b[1] + (this.rnd() - 0.5) * amp * 0.4,
      ]);
    }
    return out;
  }

  private trace(pts: P[], close: boolean) {
    const ctx = this.ctx;
    ctx.beginPath();
    if (pts.length < 2) return;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const lastPt = pts[pts.length - 1];
    ctx.lineTo(lastPt[0], lastPt[1]);
    if (close) ctx.closePath();
  }

  path(pts: P[], o: StrokeOpts = {}) {
    if (pts.length < 2) return;
    const ctx = this.ctx;
    const amp = o.amp ?? 1.1;
    const step = o.step ?? 9;
    const close = o.close ?? false;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (o.fill) {
      const f = this.wobble(pts, amp * 0.7, step, close);
      this.trace(f, true);
      ctx.fillStyle = o.fill;
      ctx.fill();
    }
    if (o.stroke) {
      const passes = o.passes ?? 2;
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.width ?? 2;
      for (let p = 0; p < passes; p++) {
        const w = this.wobble(pts, amp, step, close);
        this.trace(w, close);
        ctx.globalAlpha = p === 0 ? 1 : 0.55;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, o: StrokeOpts = {}) {
    this.path(
      [
        [x1, y1],
        [x2, y2],
      ],
      { passes: 1, ...o },
    );
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, o: StrokeOpts = {}) {
    const pts: P[] = [];
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    this.path(pts, { close: true, step: Math.max(5, rx / 2), ...o });
  }

  rect(x: number, y: number, w: number, h: number, o: StrokeOpts = {}) {
    this.path(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      { close: true, ...o },
    );
  }

  /** Scribble fill, like colouring in with a marker. */
  scribble(x: number, y: number, w: number, h: number, color: string, gap = 6, seedAmp = 2) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = gap * 0.75;
    ctx.lineCap = "round";
    for (let yy = y; yy < y + h; yy += gap) {
      const pts: P[] = [
        [x + this.rnd() * seedAmp, yy],
        [x + w - this.rnd() * seedAmp, yy + (this.rnd() - 0.5) * seedAmp],
      ];
      this.trace(this.wobble(pts, seedAmp, 12, false), false);
      ctx.stroke();
    }
  }
}

const shade = (hex: string, amt: number) => {
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
};

export function drawPieceShape(
  ctx: CanvasRenderingContext2D,
  kind: PieceKind,
  size: number,
  color: string,
  seed = 3,
) {
  const sk = new Sketch(ctx, seed);
  const S = (v: number) => v * size;
  const pt = (x: number, y: number): P => [S(x), S(y)];
  const lw = Math.max(1.6, size * 0.075);
  const base: StrokeOpts = { stroke: INK, width: lw, fill: color, amp: size * 0.022, step: size * 0.16 };
  const ink: StrokeOpts = { stroke: INK, width: lw * 0.72, amp: size * 0.018, step: size * 0.14, passes: 1 };
  const white = "#fffaf0";

  const eye = (x: number, y: number, r = 0.045) => {
    sk.ellipse(S(x), S(y), S(r), S(r), { fill: white, stroke: INK, width: lw * 0.5, amp: size * 0.012 });
    sk.ellipse(S(x + 0.008), S(y), S(r * 0.42), S(r * 0.42), { fill: INK, amp: size * 0.008 });
  };

  switch (kind) {
    case "pawn": {
      // Pedestal base
      sk.path([pt(-0.28, 0.42), pt(-0.2, 0.3), pt(0.2, 0.3), pt(0.28, 0.42)], { ...base, close: true });
      // Body tunic
      sk.path([pt(-0.16, 0.3), pt(-0.1, 0.04), pt(0.1, 0.04), pt(0.16, 0.3)], { ...base, close: true });
      // Tunic belt & button
      sk.line(S(-0.14), S(0.18), S(0.14), S(0.18), ink);
      sk.ellipse(0, S(0.1), S(0.02), S(0.02), { fill: INK });
      // Round head
      sk.ellipse(0, S(-0.12), S(0.16), S(0.16), base);
      // Cute soldier helmet brim & feather plume doodle
      sk.path([pt(-0.18, -0.12), pt(0, -0.16), pt(0.18, -0.12)], { ...ink, width: lw * 1.1 });
      sk.path([pt(0.04, -0.28), pt(0.14, -0.38), pt(0.2, -0.32)], { stroke: "#d8443c", width: lw * 0.8, passes: 1 });
      eye(-0.06, -0.1, 0.035);
      eye(0.06, -0.1, 0.035);
      // Little spear doodle on side
      sk.line(S(0.22), S(0.4), S(0.22), S(-0.36), { ...ink, width: lw * 0.8 });
      sk.path([pt(0.18, -0.32), pt(0.22, -0.44), pt(0.26, -0.32)], { fill: white, stroke: INK, width: lw * 0.7, close: true });
      break;
    }
    case "knight": {
      sk.path(
        [
          pt(-0.26, 0.42),
          pt(-0.2, 0.24),
          pt(-0.24, 0.04),
          pt(-0.32, -0.06),
          pt(-0.18, -0.22),
          pt(-0.14, -0.36),
          pt(0.02, -0.44),
          pt(0.14, -0.32),
          pt(0.22, -0.05),
          pt(0.18, 0.16),
          pt(0.24, 0.42),
        ],
        { ...base, close: true },
      );
      // Snout nostril & mouth
      sk.ellipse(S(-0.26), S(-0.08), S(0.025), S(0.025), { fill: INK });
      sk.line(S(-0.3), S(-0.02), S(-0.22), S(0.02), ink);
      // Ear
      sk.path([pt(-0.02, -0.42), pt(0.04, -0.52), pt(0.1, -0.4)], { ...base, close: true });
      // Flowing mane pencil strokes
      for (const y of [-0.28, -0.16, -0.04, 0.08]) {
        sk.path([pt(0.14, y), pt(0.26, y + 0.08)], { ...ink, width: lw * 0.85 });
      }
      // Reins doodle
      sk.path([pt(-0.2, -0.04), pt(0.02, 0.06), pt(0.12, 0.2)], { ...ink, width: lw * 0.75 });
      eye(-0.08, -0.22, 0.042);
      // Base line
      sk.path([pt(-0.24, 0.42), pt(0.22, 0.42)], { ...ink, width: lw * 1.1 });
      break;
    }
    case "bishop": {
      // Base pedestal
      sk.path([pt(-0.28, 0.42), pt(-0.22, 0.3), pt(0.22, 0.3), pt(0.28, 0.42)], { ...base, close: true });
      // Mitre robe
      sk.path(
        [pt(-0.18, 0.3), pt(-0.2, 0.06), pt(-0.12, -0.2), pt(0, -0.44), pt(0.12, -0.2), pt(0.2, 0.06), pt(0.18, 0.3)],
        { ...base, close: true },
      );
      // Cross cleft in mitre
      sk.line(S(0), S(-0.4), S(0), S(-0.14), { ...ink, width: lw * 0.9 });
      sk.line(S(-0.1), S(-0.26), S(0.1), S(-0.26), { ...ink, width: lw * 0.9 });
      // Stole sash folds
      sk.line(S(-0.08), S(-0.02), S(-0.12), S(0.3), ink);
      sk.line(S(0.08), S(-0.02), S(0.12), S(0.3), ink);
      // Little cross on top
      sk.line(S(0), S(-0.44), S(0), S(-0.54), { ...ink, width: lw * 0.8 });
      sk.line(S(-0.05), S(-0.49), S(0.05), S(-0.49), { ...ink, width: lw * 0.8 });
      // Hand-drawn shepherd's crook / staff
      sk.path([pt(0.22, 0.4), pt(0.22, -0.32), pt(0.3, -0.4), pt(0.24, -0.48), pt(0.16, -0.42)], {
        ...ink,
        width: lw * 0.8,
      });
      break;
    }
    case "rook": {
      // Base
      sk.path([pt(-0.32, 0.42), pt(-0.24, 0.3), pt(0.24, 0.3), pt(0.32, 0.42)], { ...base, close: true });
      // Wall tower body
      sk.path([pt(-0.22, 0.3), pt(-0.18, -0.1), pt(0.18, -0.1), pt(0.22, 0.3)], { ...base, close: true });
      // Crenellations (battlements)
      sk.path(
        [
          pt(-0.28, -0.1),
          pt(-0.28, -0.34),
          pt(-0.16, -0.34),
          pt(-0.16, -0.22),
          pt(-0.06, -0.22),
          pt(-0.06, -0.34),
          pt(0.06, -0.34),
          pt(0.06, -0.22),
          pt(0.16, -0.22),
          pt(0.16, -0.34),
          pt(0.28, -0.34),
          pt(0.28, -0.1),
        ],
        { ...base, close: true },
      );
      // Heavy arched doorway with plank marks
      sk.path([pt(-0.08, 0.3), pt(-0.08, 0.1), pt(0.08, 0.1), pt(0.08, 0.3)], {
        fill: shade(color, -60),
        stroke: INK,
        width: lw * 0.8,
        close: true,
      });
      sk.line(S(0), S(0.12), S(0), S(0.3), ink);
      // Arrow-slit window
      sk.line(S(0), S(-0.04), S(0), S(0.04), { ...ink, width: lw * 0.9 });
      sk.line(S(-0.04), S(0), S(0.04), S(0), { ...ink, width: lw * 0.9 });
      // Brick hatch lines
      sk.line(S(-0.16), S(0.02), S(-0.1), S(0.02), ink);
      sk.line(S(0.1), S(0.02), S(0.16), S(0.02), ink);
      sk.line(S(-0.14), S(0.18), S(-0.1), S(0.18), ink);
      break;
    }
    case "queen": {
      // Base
      sk.path([pt(-0.32, 0.42), pt(-0.24, 0.3), pt(0.24, 0.3), pt(0.32, 0.42)], { ...base, close: true });
      // Robe dress
      sk.path([pt(-0.22, 0.3), pt(-0.14, 0.02), pt(0.14, 0.02), pt(0.22, 0.3)], { ...base, close: true });
      // Spiked Queen Crown
      sk.path(
        [
          pt(-0.28, 0.02),
          pt(-0.34, -0.34),
          pt(-0.16, -0.14),
          pt(0.0, -0.42),
          pt(0.16, -0.14),
          pt(0.34, -0.34),
          pt(0.28, 0.02),
        ],
        { ...base, close: true },
      );
      // Crown tip pearls
      sk.ellipse(S(-0.34), S(-0.38), S(0.045), S(0.045), { fill: white, stroke: INK, width: lw * 0.6 });
      sk.ellipse(S(0.34), S(-0.38), S(0.045), S(0.045), { fill: white, stroke: INK, width: lw * 0.6 });
      sk.ellipse(0, S(-0.46), S(0.05), S(0.05), { fill: "#ffe066", stroke: INK, width: lw * 0.6 });
      sk.ellipse(S(-0.16), S(-0.18), S(0.035), S(0.035), { fill: white, stroke: INK, width: lw * 0.5 });
      sk.ellipse(S(0.16), S(-0.18), S(0.035), S(0.035), { fill: white, stroke: INK, width: lw * 0.5 });
      // Dress necklace & waist sash
      sk.line(S(-0.1), S(0.08), S(0.1), S(0.08), { stroke: "#ffe066", width: lw * 0.8, passes: 1 });
      sk.line(S(-0.18), S(0.22), S(0.18), S(0.22), ink);
      // Sparkle doodle next to crown
      sk.line(S(0.36), S(-0.16), S(0.44), S(-0.16), { stroke: "#ffe066", width: 1.5, passes: 1 });
      sk.line(S(0.4), S(-0.2), S(0.4), S(-0.12), { stroke: "#ffe066", width: 1.5, passes: 1 });
      break;
    }
    case "king": {
      // Base
      sk.path([pt(-0.34, 0.44), pt(-0.24, 0.3), pt(0.24, 0.3), pt(0.34, 0.44)], { ...base, close: true });
      // Robe body
      sk.path([pt(-0.24, 0.3), pt(-0.16, 0.02), pt(0.16, 0.02), pt(0.24, 0.3)], { ...base, close: true });
      // Crown base
      sk.path(
        [
          pt(-0.3, 0.02),
          pt(-0.32, -0.26),
          pt(-0.16, -0.12),
          pt(0.0, -0.3),
          pt(0.16, -0.12),
          pt(0.32, -0.26),
          pt(0.3, 0.02),
        ],
        { ...base, close: true },
      );
      // Crown cross
      sk.line(S(0), S(-0.3), S(0), S(-0.52), { ...ink, width: lw * 1.1 });
      sk.line(S(-0.09), S(-0.43), S(0.09), S(-0.43), { ...ink, width: lw * 1.1 });
      // Crown band jewels
      sk.ellipse(S(-0.16), S(-0.04), S(0.035), S(0.035), { fill: "#ffe066", stroke: INK, width: lw * 0.5 });
      sk.ellipse(0, S(-0.04), S(0.035), S(0.035), { fill: "#e8574c", stroke: INK, width: lw * 0.5 });
      sk.ellipse(S(0.16), S(-0.04), S(0.035), S(0.035), { fill: "#4a86e8", stroke: INK, width: lw * 0.5 });
      // Royal ermine cape dots & collar
      sk.line(S(-0.16), S(0.14), S(0.16), S(0.14), ink);
      sk.ellipse(S(-0.08), S(0.22), S(0.02), S(0.02), { fill: INK });
      sk.ellipse(S(0.08), S(0.22), S(0.02), S(0.02), { fill: INK });
      // Quirky royal mustache doodle
      sk.path([pt(-0.08, -0.08), pt(-0.03, -0.05), pt(0, -0.07), pt(0.03, -0.05), pt(0.08, -0.08)], {
        ...ink,
        width: lw * 0.9,
      });
      break;
    }
    case "farm": {
      // Pitched barn roof with sketched planks
      sk.path([pt(-0.36, 0.02), pt(0.0, -0.38), pt(0.36, 0.02)], { ...base, fill: shade(color, -35), close: true });
      sk.line(S(-0.24), S(-0.14), S(0.24), S(-0.14), ink);
      // Barn walls
      sk.path([pt(-0.3, 0.02), pt(0.3, 0.02), pt(0.3, 0.4), pt(-0.3, 0.4)], { ...base, close: true });
      // Barn door with wooden 'X' brace
      sk.path([pt(-0.1, 0.4), pt(-0.1, 0.12), pt(0.1, 0.12), pt(0.1, 0.4)], {
        ...base,
        fill: shade(color, -60),
        close: true,
      });
      sk.line(S(-0.09), S(0.13), S(0.09), S(0.39), { ...ink, width: lw * 0.8 });
      sk.line(S(0.09), S(0.13), S(-0.09), S(0.39), { ...ink, width: lw * 0.8 });
      // Hayloft window
      sk.rect(S(-0.06), S(-0.16), S(0.12), S(0.1), { fill: white, stroke: INK, width: lw * 0.7 });
      sk.line(S(0), S(-0.16), S(0), S(-0.06), ink);
      // 3 Hand-drawn wheat stalks on the right
      for (const ox of [0.34, 0.4, 0.46]) {
        sk.line(S(ox), S(0.4), S(ox), S(0.12), { stroke: "#b89020", width: lw * 0.7, passes: 1 });
        sk.ellipse(S(ox), S(0.1), S(0.03), S(0.06), { fill: "#ffe066", stroke: INK, width: lw * 0.5 });
      }
      break;
    }
    case "harbor": {
      // Wood jetty boardwalk
      sk.path([pt(-0.42, -0.06), pt(0.42, -0.06), pt(0.42, 0.1), pt(-0.42, 0.1)], {
        ...base,
        fill: shade(color, -25),
        close: true,
      });
      // Boardwalk plank seams & nail marks
      for (const x of [-0.28, -0.14, 0.0, 0.14, 0.28]) {
        sk.line(S(x), S(-0.06), S(x), S(0.1), ink);
      }
      // Wooden pilings sunk down into water
      for (const x of [-0.34, -0.08, 0.18, 0.36]) {
        sk.path([pt(x, 0.1), pt(x - 0.02, 0.42)], { stroke: INK, width: lw * 1.5, passes: 1 });
      }
      // Water wave ripples
      sk.path([pt(-0.4, 0.24), pt(-0.25, 0.2), pt(-0.1, 0.24)], { stroke: "#1f3a4d", width: lw * 0.8, passes: 1 });
      sk.path([pt(0.05, 0.32), pt(0.2, 0.28), pt(0.35, 0.32)], { stroke: "#1f3a4d", width: lw * 0.8, passes: 1 });
      // Little anchor doodle on the dock
      sk.line(S(-0.25), S(-0.16), S(-0.25), S(-0.04), { ...ink, width: lw * 0.8 });
      sk.ellipse(S(-0.25), S(-0.18), S(0.03), S(0.03), { stroke: INK, width: lw * 0.6 });
      sk.path([pt(-0.31, -0.06), pt(-0.25, -0.02), pt(-0.19, -0.06)], { ...ink, width: lw * 0.8 });
      break;
    }
    case "dragon": {
      // Dragon body
      sk.path(
        [
          pt(-0.36, 0.36),
          pt(-0.16, 0.32),
          pt(-0.02, 0.12),
          pt(-0.2, 0.02),
          pt(-0.16, -0.18),
          pt(0.02, -0.32),
          pt(0.26, -0.24),
          pt(0.34, -0.06),
          pt(0.2, 0.06),
          pt(0.1, -0.04),
          pt(0.16, -0.16),
          pt(0.0, -0.18),
          pt(0.06, 0.06),
          pt(0.22, 0.22),
          pt(0.12, 0.38),
          pt(-0.18, 0.42),
        ],
        { ...base, close: true },
      );
      // Bat wings
      sk.path([pt(-0.04, -0.3), pt(0.02, -0.46), pt(0.12, -0.3)], { ...ink, width: lw * 1.1 });
      sk.path([pt(0.16, -0.3), pt(0.26, -0.46), pt(0.28, -0.28)], { ...ink, width: lw * 1.1 });
      // Horns
      sk.path([pt(-0.04, -0.34), pt(-0.08, -0.44)], { ...ink, width: lw });
      sk.path([pt(0.02, -0.36), pt(0.02, -0.46)], { ...ink, width: lw });
      // Snout eye & nostril
      eye(0.16, -0.2, 0.04);
      sk.ellipse(S(0.28), S(-0.16), S(0.02), S(0.02), { fill: INK });
      // Cute puff of hand-drawn smoke / flame sparks from nostrils
      sk.path([pt(0.36, -0.16), pt(0.44, -0.22), pt(0.48, -0.18)], { stroke: "#e8574c", width: lw * 0.8, passes: 1 });
      sk.ellipse(S(0.46), S(-0.26), S(0.025), S(0.025), { fill: "#ffe066" });
      // Back ridge scales
      sk.path([pt(-0.28, 0.32), pt(-0.36, 0.16), pt(-0.2, 0.2)], { ...ink });
      break;
    }
    case "nuke": {
      // Rounded rocket fuselage
      sk.ellipse(0, S(0.08), S(0.28), S(0.32), base);
      // Tail rocket booster section
      sk.path([pt(-0.1, -0.22), pt(-0.1, -0.38), pt(0.1, -0.38), pt(0.1, -0.22)], { ...base, close: true });
      // Tail stabilizer fins
      sk.path([pt(-0.28, -0.3), pt(-0.18, -0.36), pt(-0.12, -0.24)], { ...base, close: true });
      sk.path([pt(0.28, -0.3), pt(0.18, -0.36), pt(0.12, -0.24)], { ...base, close: true });
      // Fuse tip & nose rivets
      sk.line(0, S(0.4), 0, S(0.48), { stroke: "#e8574c", width: lw * 1.1, passes: 1 });
      sk.ellipse(0, S(0.48), S(0.03), S(0.03), { fill: "#ffe066" });
      // Hand-drawn radiation symbol (yellow circle with 3 black hazard blades)
      sk.ellipse(0, S(0.08), S(0.12), S(0.12), { fill: "#ffe066", stroke: INK, width: lw * 0.7 });
      sk.ellipse(0, S(0.08), S(0.03), S(0.03), { fill: INK });
      for (let k = 0; k < 3; k++) {
        const ang = (k * Math.PI * 2) / 3 - Math.PI / 2;
        const x1 = Math.cos(ang - 0.35) * S(0.09);
        const y1 = S(0.08) + Math.sin(ang - 0.35) * S(0.09);
        const x2 = Math.cos(ang + 0.35) * S(0.09);
        const y2 = S(0.08) + Math.sin(ang + 0.35) * S(0.09);
        sk.path([[0, S(0.08)], [x1, y1], [x2, y2]], { fill: INK, close: true });
      }
      break;
    }
    case "portal": {
      sk.ellipse(0, 0, S(0.32), S(0.38), { ...base, fill: shade(color, -30) });
      const spiral: P[] = [];
      for (let i = 0; i < 46; i++) {
        const t = i / 46;
        const a = t * Math.PI * 4.2;
        const r = 0.3 * (1 - t);
        spiral.push(pt(Math.cos(a) * r, Math.sin(a) * r * 1.15));
      }
      sk.path(spiral, { stroke: white, width: lw * 0.8, amp: size * 0.015, step: size * 0.1, passes: 2 });
      // Sparkle dots around portal
      for (const [sx, sy] of [[-0.24, -0.28], [0.26, -0.22], [-0.18, 0.28], [0.22, 0.24]]) {
        sk.ellipse(S(sx), S(sy), S(0.02), S(0.02), { fill: "#ffe066" });
      }
      break;
    }
    case "spider": {
      for (let i = 0; i < 4; i++) {
        const y = -0.14 + i * 0.12;
        sk.path([pt(-0.06, y * 0.6), pt(-0.28, y - 0.08), pt(-0.42, y + 0.06)], { ...ink, width: lw * 0.95 });
        sk.path([pt(0.06, y * 0.6), pt(0.28, y - 0.08), pt(0.42, y + 0.06)], { ...ink, width: lw * 0.95 });
      }
      sk.ellipse(0, S(0.06), S(0.22), S(0.24), base);
      sk.ellipse(0, S(-0.16), S(0.14), S(0.13), base);
      // Abdomen crosshatch texture
      sk.line(S(-0.1), S(0.02), S(0.1), S(0.02), ink);
      sk.line(S(-0.12), S(0.12), S(0.12), S(0.12), ink);
      eye(-0.06, -0.18, 0.038);
      eye(0.06, -0.18, 0.038);
      eye(-0.02, -0.13, 0.025);
      eye(0.02, -0.13, 0.025);
      break;
    }
    case "snake": {
      const body: P[] = [
        pt(-0.34, 0.36),
        pt(-0.1, 0.3),
        pt(-0.02, 0.1),
        pt(-0.24, 0.0),
        pt(-0.2, -0.2),
        pt(0.02, -0.3),
        pt(0.22, -0.22),
      ];
      ctx.lineCap = "round";
      sk.path(body, { stroke: INK, width: lw * 3.2, amp: size * 0.02, step: size * 0.14, passes: 1 });
      sk.path(body, { stroke: color, width: lw * 2.2, amp: size * 0.015, step: size * 0.14, passes: 1 });
      // Scale tick marks along spine
      for (const [bx, by] of [[-0.2, 0.32], [-0.08, 0.18], [-0.22, -0.1], [0.08, -0.26]]) {
        sk.line(S(bx - 0.03), S(by - 0.03), S(bx + 0.03), S(by + 0.03), { stroke: INK, width: lw * 0.6, passes: 1 });
      }
      sk.ellipse(S(0.24), S(-0.24), S(0.12), S(0.1), base);
      eye(0.26, -0.27, 0.035);
      // Forked tongue
      sk.path([pt(0.34, -0.2), pt(0.44, -0.18), pt(0.48, -0.14)], { stroke: "#d8443c", width: lw * 0.8, passes: 1 });
      sk.path([pt(0.44, -0.18), pt(0.48, -0.22)], { stroke: "#d8443c", width: lw * 0.8, passes: 1 });
      break;
    }
    case "plane": {
      // Fuselage
      sk.path([pt(0.0, -0.44), pt(0.1, -0.1), pt(0.08, 0.3), pt(0.0, 0.4), pt(-0.08, 0.3), pt(-0.1, -0.1)], {
        ...base,
        close: true,
      });
      // Main wings
      sk.path([pt(-0.08, -0.04), pt(-0.46, 0.12), pt(-0.46, 0.22), pt(-0.07, 0.16)], { ...base, close: true });
      sk.path([pt(0.08, -0.04), pt(0.46, 0.12), pt(0.46, 0.22), pt(0.07, 0.16)], { ...base, close: true });
      // Wing struts
      sk.line(S(-0.26), S(0.06), S(-0.26), S(0.24), ink);
      sk.line(S(0.26), S(0.06), S(0.26), S(0.24), ink);
      // Tail wings
      sk.path([pt(-0.04, 0.28), pt(-0.22, 0.36), pt(-0.22, 0.42), pt(-0.03, 0.38)], { ...base, close: true });
      sk.path([pt(0.04, 0.28), pt(0.22, 0.36), pt(0.22, 0.42), pt(0.03, 0.38)], { ...base, close: true });
      // Cockpit with pilot goggles
      sk.ellipse(0, S(-0.16), S(0.06), S(0.09), { fill: white, stroke: INK, width: lw * 0.6 });
      sk.ellipse(S(-0.02), S(-0.16), S(0.02), S(0.02), { fill: INK });
      sk.ellipse(S(0.02), S(-0.16), S(0.02), S(0.02), { fill: INK });
      // Spinning propeller scribble at nose
      sk.ellipse(0, S(-0.44), S(0.18), S(0.04), { stroke: "rgba(43,33,24,0.45)", width: 1.2 });
      break;
    }
    case "boat": {
      // Wood hull
      sk.path([pt(-0.4, 0.12), pt(0.4, 0.12), pt(0.26, 0.38), pt(-0.26, 0.38)], {
        ...base,
        fill: shade(color, -40),
        close: true,
      });
      // Hull wooden plank seams
      sk.line(S(-0.36), S(0.2), S(0.36), S(0.2), ink);
      sk.line(S(-0.3), S(0.28), S(0.3), S(0.28), ink);
      // Mast
      sk.line(S(0.0), S(0.12), S(0.0), S(-0.44), { ...ink, width: lw * 1.3 });
      // Mainsail (billowed canvas)
      sk.path([pt(0.03, -0.42), pt(0.34, 0.04), pt(0.03, 0.04)], { ...base, close: true });
      // Jib sail (front white canvas)
      sk.path([pt(-0.03, -0.32), pt(-0.28, 0.04), pt(-0.03, 0.04)], { ...base, fill: white, close: true });
      // Fluttering mast pennant flag
      sk.path([pt(0, -0.44), pt(-0.14, -0.4), pt(0, -0.36)], { fill: "#ffe066", stroke: INK, width: lw * 0.6, close: true });
      // Bow wave ripple doodle
      sk.path([pt(-0.34, 0.42), pt(-0.2, 0.4), pt(-0.06, 0.42)], { stroke: "#1f3a4d", width: lw * 0.8, passes: 1 });
      break;
    }
    case "tank": {
      // Ironclad tread shield
      sk.path([pt(-0.38, 0.14), pt(0.38, 0.14), pt(0.34, 0.38), pt(-0.34, 0.38)], {
        ...base,
        fill: shade(color, -35),
        close: true,
      });
      // Tread wheels
      for (const wx of [-0.24, -0.08, 0.08, 0.24]) {
        sk.ellipse(S(wx), S(0.26), S(0.05), S(0.05), { fill: INK });
      }
      // Main armored sloped hull
      sk.path([pt(-0.32, -0.06), pt(0.32, -0.06), pt(0.36, 0.14), pt(-0.36, 0.14)], {
        ...base,
        close: true,
      });
      // Turret Dome
      sk.ellipse(0, S(-0.16), S(0.18), S(0.12), { fill: shade(color, 20), stroke: INK, width: lw });
      // Gun barrel blast muzzle pointing forward right
      sk.path([pt(0.08, -0.19), pt(0.44, -0.19), pt(0.44, -0.11), pt(0.08, -0.11)], {
        ...base,
        fill: "#ffe066",
        close: true,
      });
      // Small decorative flag on mast back-left
      sk.line(S(-0.16), S(-0.16), S(-0.16), S(-0.4), { ...ink, width: lw * 0.7 });
      sk.path([pt(-0.16, -0.4), pt(-0.28, -0.34), pt(-0.16, -0.28)], { fill: "#ef4444", stroke: INK, width: lw * 0.6, close: true });
      break;
    }
  }
}

/* sprite cache so the board stays fast while still being hand-drawn */
const spriteCache = new Map<string, HTMLCanvasElement>();

export function getSprite(kind: PieceKind, color: string, size: number, dpr = 1): HTMLCanvasElement {
  const px = Math.round(size);
  const key = `${kind}|${color}|${px}|${dpr}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;

  const pad = Math.round(px * 0.28);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((px + pad * 2) * dpr);
  canvas.height = Math.round((px + pad * 2) * dpr);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.translate((px + pad * 2) / 2, (px + pad * 2) / 2);
    let seed = 11;
    for (let i = 0; i < kind.length; i++) seed = (seed * 31 + kind.charCodeAt(i)) % 99991;
    drawPieceShape(ctx, kind, px, color, seed);
  }
  spriteCache.set(key, canvas);
  return canvas;
}

export function spritePad(size: number) {
  return Math.round(size * 0.28);
}

/** Hand drawn arrow used for planning arrows and last-move hints. */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 5,
  seed = 5,
) {
  const sk = new Sketch(ctx, seed);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bow = Math.min(18, len * 0.12);
  const mx = (x1 + x2) / 2 - uy * bow;
  const my = (y1 + y2) / 2 + ux * bow;
  sk.path(
    [
      [x1, y1],
      [mx, my],
      [x2 - ux * width * 1.4, y2 - uy * width * 1.4],
    ],
    { stroke: color, width, amp: 2.2, step: 16, passes: 2 },
  );
  const head = width * 3.2;
  const ang = Math.atan2(y2 - my, x2 - mx);
  sk.path(
    [
      [x2 - Math.cos(ang - 0.42) * head, y2 - Math.sin(ang - 0.42) * head],
      [x2, y2],
      [x2 - Math.cos(ang + 0.42) * head, y2 - Math.sin(ang + 0.42) * head],
    ],
    { stroke: color, width, amp: 1.6, step: 12, passes: 2 },
  );
}
