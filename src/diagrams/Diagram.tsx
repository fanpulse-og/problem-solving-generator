import type { DiagramSpec } from '../engine/types';

/**
 * SVG diagrams drawn from the question's own variables, so the picture always
 * matches the numbers. Shapes are scaled to fit; like the papers they carry
 * "Diagram NOT accurately drawn".
 */
export function Diagram({ spec }: { spec: DiagramSpec }) {
  const body =
    spec.type === 'polygon' ? (
      <Polygon spec={spec} />
    ) : spec.type === 'squareSemicircles' ? (
      <SquareSemicircles />
    ) : spec.type === 'parallelTriangle' ? (
      <ParallelTriangle spec={spec} />
    ) : spec.type === 'figure' ? (
      <Figure spec={spec} />
    ) : spec.type === 'histogram' ? (
      <Histogram spec={spec} />
    ) : spec.type === 'grid' ? (
      <Grid spec={spec} />
    ) : spec.type === 'tree' ? (
      <Tree spec={spec} />
    ) : spec.type === 'venn' ? (
      <Venn spec={spec} />
    ) : spec.type === 'pie' ? (
      <Pie spec={spec} />
    ) : (
      <Plate spec={spec} />
    );
  return (
    <figure className="diagram">
      {body}
      {spec.notAccurate && <figcaption>Diagram NOT accurately drawn</figcaption>}
    </figure>
  );
}

const W = 360;
const H = 240;
const PAD = 40;

function Polygon({ spec }: { spec: Extract<DiagramSpec, { type: 'polygon' }> }) {
  const xs = spec.points.map((p) => p[0]);
  const ys = spec.points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((W - 2 * PAD) / (maxX - minX || 1), (H - 2 * PAD) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  // y up in the spec, y down in SVG
  const t = ([x, y]: [number, number]): [number, number] => [ox + (x - minX) * scale, H - (oy + (y - minY) * scale)];
  const pts = spec.points.map(t);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const label = (edge: number, text: string) => {
    const a = pts[edge];
    const b = pts[(edge + 1) % pts.length];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    if ((mx - cx) * nx + (my - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const d = 16;
    return (
      <text key={`l${edge}`} x={mx + nx * d} y={my + ny * d + 5} textAnchor={Math.abs(nx) > 0.6 ? (nx > 0 ? 'start' : 'end') : 'middle'} className="dlabel">
        {text}
      </text>
    );
  };
  const rightAngle = (i: number) => {
    const p = pts[i];
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const u = unit(p, a);
    const v = unit(p, b);
    const s = 11;
    const q1: [number, number] = [p[0] + u[0] * s, p[1] + u[1] * s];
    const q2: [number, number] = [p[0] + (u[0] + v[0]) * s, p[1] + (u[1] + v[1]) * s];
    const q3: [number, number] = [p[0] + v[0] * s, p[1] + v[1] * s];
    return <polyline key={`r${i}`} points={[q1, q2, q3].map((q) => q.join(',')).join(' ')} className="dthin" />;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Diagram of the shape">
      <polygon points={pts.map((p) => p.join(',')).join(' ')} className="dshape" />
      {spec.dashed?.map(([a, b], i) => {
        const [p, q] = [t(a), t(b)];
        return <line key={`d${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className="ddash" />;
      })}
      {spec.rightAngles?.map(rightAngle)}
      {spec.edgeLabels?.map((l) => label(l.edge, l.text))}
      {spec.angleLabels?.map((txt, i) => {
        if (!txt) return null;
        const p = pts[i];
        const u = unit(p, pts[(i + pts.length - 1) % pts.length]);
        const w = unit(p, pts[(i + 1) % pts.length]);
        const bis = unit([0, 0], [u[0] + w[0], u[1] + w[1]]);
        const r = labelDistance(u, w, txt, 30);
        return (
          <g key={`a${i}`}>
            <AngleArc at={p} u={u} w={w} r={14} />
            <MathSvgText x={p[0] + bis[0] * r} y={p[1] + bis[1] * r + 5} text={txt} />
          </g>
        );
      })}
      {spec.vertexLabels?.map((txt, i) => {
        const p = pts[i];
        const u = unit([cx, cy], p);
        return (
          <text key={`v${i}`} x={p[0] + u[0] * 14} y={p[1] + u[1] * 14 + 5} textAnchor="middle" className="dlabel">
            {txt}
          </text>
        );
      })}
    </svg>
  );
}

function unit(from: [number, number], to: [number, number]): [number, number] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

function SquareSemicircles() {
  const s = 100;
  const x0 = (W - s) / 2;
  const y0 = (H - s) / 2;
  const r = s / 2;
  const [x1, y1] = [x0 + s, y0 + s];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A square with a semicircle on each side">
      <path
        className="dshape"
        d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} A ${r} ${r} 0 0 1 ${x0} ${y1} A ${r} ${r} 0 0 1 ${x0} ${y0} Z`}
      />
      <rect x={x0} y={y0} width={s} height={s} className="dline" />
      {[
        ['A', x0 - 10, y0 - 6],
        ['B', x1 + 10, y0 - 6],
        ['C', x1 + 10, y1 + 16],
        ['D', x0 - 10, y1 + 16],
      ].map(([t, x, y]) => (
        <text key={t as string} x={x as number} y={y as number} textAnchor="middle" className="dlabel">
          {t}
        </text>
      ))}
    </svg>
  );
}

function Plate({ spec }: { spec: Extract<DiagramSpec, { type: 'plateCutouts' }> }) {
  const L = 240;
  const Wd = 100;
  const x0 = (W - L) / 2;
  const y0 = (H - Wd) / 2;
  const [x1, y1] = [x0 + L, y0 + Wd];
  const r = Wd / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A rectangular plate with a semicircle cut from each end">
      <path className="dshape" d={`M ${x0} ${y0} L ${x1} ${y0} A ${r} ${r} 0 0 0 ${x1} ${y1} L ${x0} ${y1} A ${r} ${r} 0 0 0 ${x0} ${y0} Z`} />
      <line x1={x0} y1={y0} x2={x0} y2={y1} className="ddash" />
      <line x1={x1} y1={y0} x2={x1} y2={y1} className="ddash" />
      <text x={(x0 + x1) / 2} y={y0 - 12} textAnchor="middle" className="dlabel">
        {spec.lengthLabel}
      </text>
      <text x={x1 + 10} y={(y0 + y1) / 2 + 5} className="dlabel">
        {spec.widthLabel}
      </text>
    </svg>
  );
}

/** SVG text where single letters (variables) are italic, e.g. "(3x + 10)°". */
export function MathSvgText({ x, y, text, anchor = 'middle' }: { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' }) {
  const parts = text.split(/((?<![a-z])(?<!\d )[a-z](?![a-z]))/);
  return (
    <text x={x} y={y} textAnchor={anchor} className="dlabel">
      {parts.map((p, i) =>
        /^[a-z]$/.test(p) ? (
          <tspan key={i} fontStyle="italic">
            {p}
          </tspan>
        ) : (
          <tspan key={i}>{p.replace(/-/g, '−')}</tspan>
        ),
      )}
    </text>
  );
}

/**
 * How far from the vertex to put an angle label so it sits inside the angle
 * without touching either arm: narrow angles and long labels go further out.
 */
function labelDistance(u: [number, number], w: [number, number], text: string, min: number): number {
  const theta = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1])));
  const halfWidth = (text.length * 7.2) / 2 + 3;
  return Math.min(110, Math.max(min, halfWidth / Math.sin(theta / 2)));
}

/** A small arc marking the angle at `at` between unit directions u and w. */
function AngleArc({ at, u, w, r }: { at: [number, number]; u: [number, number]; w: [number, number]; r: number }) {
  const p1 = [at[0] + u[0] * r, at[1] + u[1] * r];
  const p2 = [at[0] + w[0] * r, at[1] + w[1] * r];
  const cross = u[0] * w[1] - u[1] * w[0];
  return <path d={`M ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${p2[0]} ${p2[1]}`} className="dthin" />;
}

function ParallelTriangle({ spec }: { spec: Extract<DiagramSpec, { type: 'parallelTriangle' }> }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  // Model coordinates: top line y = 1, bottom line y = 0 (y up).
  const P: [number, number] = [0, 1];
  const Q: [number, number] = [-1 / Math.tan(rad(spec.a)), 0];
  const R: [number, number] = [Q[0] + 1 / Math.tan(rad(spec.b)), 1];
  const left = Math.min(P[0], Q[0]) - 0.9;
  const right = Math.max(R[0], Q[0]) + 0.9;
  const scale = Math.min((W - 60) / (right - left), 120);
  const ox = (W - (right - left) * scale) / 2;
  const t = ([x, y]: [number, number]): [number, number] => [ox + (x - left) * scale, 175 - y * scale];
  const [p, q, r] = [t(P), t(Q), t(R)];
  const yTop = p[1];
  const yBot = q[1];
  const xl = ox;
  const xr = ox + (right - left) * scale;
  const L: Record<string, [[number, number], [number, number], [number, number]]> = {
    APQ: [p, [xl, yTop], q],
    QPR: [p, q, r],
    PRQ: [r, p, q],
    PQR: [q, p, r],
    RQD: [q, r, [xr, yBot]],
  };
  const arrow = (x: number, y: number) => <path d={`M ${x - 6} ${y - 5} L ${x} ${y} L ${x - 6} ${y + 5}`} className="dthin" />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Two parallel lines with a triangle between them">
      <line x1={xl} y1={yTop} x2={xr} y2={yTop} className="dline" />
      <line x1={xl} y1={yBot} x2={xr} y2={yBot} className="dline" />
      {arrow((xl + p[0]) / 2, yTop)}
      {arrow((xl + q[0]) / 2, yBot)}
      <polygon points={[p, q, r].map((z) => z.join(',')).join(' ')} className="dshape" />
      {(
        [
          ['A', xl - 4, yTop - 8],
          ['P', p[0], yTop - 10],
          ['R', r[0], yTop - 10],
          ['B', xr + 4, yTop - 8],
          ['C', xl - 4, yBot + 20],
          ['Q', q[0], yBot + 20],
          ['D', xr + 4, yBot + 20],
        ] as [string, number, number][]
      ).map(([n, x, y]) => (
        <text key={n} x={x} y={y} textAnchor="middle" className="dlabel">
          {n}
        </text>
      ))}
      {Object.entries(spec.labels).map(([k, txt]) => {
        const [at, a, b] = L[k];
        const u = unit(at, a);
        const w = unit(at, b);
        const bis = unit([0, 0], [u[0] + w[0], u[1] + w[1]]);
        return (
          <g key={k}>
            <AngleArc at={at} u={u} w={w} r={16} />
            <MathSvgText x={at[0] + bis[0] * labelDistance(u, w, txt!, 30)} y={at[1] + bis[1] * labelDistance(u, w, txt!, 30) + 5} text={txt!} />
          </g>
        );
      })}
    </svg>
  );
}

function Figure({ spec }: { spec: Extract<DiagramSpec, { type: 'figure' }> }) {
  const names = Object.keys(spec.points);
  const all = names.map((n) => spec.points[n]);
  if (spec.circle) {
    const c = spec.points[spec.circle.center];
    all.push([c[0] - spec.circle.r, c[1] - spec.circle.r], [c[0] + spec.circle.r, c[1] + spec.circle.r]);
  }
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 42;
  // Side labels such as "(x − 2) cm" need room beside the shape.
  const padX = Math.max(pad, 24 + 7.5 * Math.max(0, ...(spec.edgeLabels ?? []).map((e) => e.text.length)));
  const scale = Math.min((W - 2 * padX) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  const P: Record<string, [number, number]> = {};
  for (const n of names) {
    const [x, y] = spec.points[n];
    P[n] = [ox + (x - minX) * scale, H - (oy + (y - minY) * scale)];
  }
  const cx = names.reduce((s, n) => s + P[n][0], 0) / names.length;
  const cy = names.reduce((s, n) => s + P[n][1], 0) / names.length;
  const centre: [number, number] = spec.circle ? P[spec.circle.center] : [cx, cy];
  const labelled = spec.labelled ?? names.filter((n) => !n.startsWith('_'));
  const line = ([a, b]: [string, string], cls: string, key: string) => <line key={key} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} className={cls} />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Geometry diagram">
      {spec.circle && <circle cx={P[spec.circle.center][0]} cy={P[spec.circle.center][1]} r={spec.circle.r * scale} className="dshape" />}
      {spec.segments?.map((sg, i) => line(sg, 'dshape', `s${i}`))}
      {spec.dashed?.map((sg, i) => line(sg, 'ddash', `d${i}`))}
      {spec.arrows?.map(([a, b], i) => {
        const u = unit(P[a], P[b]);
        const m = [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2];
        const back = [m[0] - u[0] * 8, m[1] - u[1] * 8];
        const n = [-u[1] * 5, u[0] * 5];
        return <path key={`ar${i}`} d={`M ${back[0] + n[0]} ${back[1] + n[1]} L ${m[0]} ${m[1]} L ${back[0] - n[0]} ${back[1] - n[1]}`} className="dthin" />;
      })}
      {spec.rightAngles?.map((r, i) => {
        const p = P[r.at];
        const u = unit(p, P[r.from]);
        const w = unit(p, P[r.to]);
        const s = 10;
        const pts = [[p[0] + u[0] * s, p[1] + u[1] * s], [p[0] + (u[0] + w[0]) * s, p[1] + (u[1] + w[1]) * s], [p[0] + w[0] * s, p[1] + w[1] * s]];
        return <polyline key={`ra${i}`} points={pts.map((q) => q.join(',')).join(' ')} className="dthin" />;
      })}
      {spec.angles?.map((a, i) => {
        const p = P[a.at];
        const u = unit(p, P[a.from]);
        const w = unit(p, P[a.to]);
        const bis = unit([0, 0], [u[0] + w[0], u[1] + w[1]]);
        const d = labelDistance(u, w, a.text, 26);
        return (
          <g key={`an${i}`}>
            <AngleArc at={p} u={u} w={w} r={14} />
            <MathSvgText x={p[0] + bis[0] * d} y={p[1] + bis[1] * d + 5} text={a.text} />
          </g>
        );
      })}
      {spec.edgeLabels?.map((e, i) => {
        const a = P[e.a];
        const b = P[e.b];
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        let nx = -(b[1] - a[1]);
        let ny = b[0] - a[0];
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        if ((mx - cx) * nx + (my - cy) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        return <MathSvgText key={`e${i}`} x={mx + nx * 15} y={my + ny * 15 + 5} text={e.text} anchor={Math.abs(nx) > 0.35 ? (nx > 0 ? 'start' : 'end') : 'middle'} />;
      })}
      {spec.dots?.map((n) => <circle key={`dot${n}`} cx={P[n][0]} cy={P[n][1]} r={2.5} fill="currentColor" />)}
      {labelled.map((n) => {
        const u = unit(centre, P[n]);
        const away = Math.hypot(P[n][0] - centre[0], P[n][1] - centre[1]) < 2 ? [0.7, 0.7] : u;
        return (
          <text key={`p${n}`} x={P[n][0] + away[0] * 13} y={P[n][1] + away[1] * 13 + 5} textAnchor="middle" className="dlabel">
            {n}
          </text>
        );
      })}
    </svg>
  );
}

function Histogram({ spec }: { spec: Extract<DiagramSpec, { type: 'histogram' }> }) {
  const Wd = 380;
  const Hd = 250;
  const left = 50;
  const bottom = Hd - 40;
  const top = 15;
  const right = Wd - 15;
  const x0 = spec.classes[0][0];
  const x1 = spec.classes[spec.classes.length - 1][1];
  const maxD = Math.max(...spec.densities.map((d) => d ?? 0));
  // A "nice" step for the frequency-density axis.
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
  const candidates = spec.gridStep ? [1, 2, 4, 5, 10, 20].map((m) => +(m * spec.gridStep!).toFixed(6)) : steps;
  const yStep = candidates.find((s) => maxD / s <= 6) ?? 100;
  const yMax = Math.ceil(maxD / yStep + 0.01) * yStep;
  const X = (x: number) => left + ((x - x0) / (x1 - x0)) * (right - left);
  const Y = (y: number) => bottom - (y / yMax) * (bottom - top);
  const xTicks = Array.from(new Set(spec.classes.flat()));
  const yTicks = Array.from({ length: Math.round(yMax / yStep) + 1 }, (_, i) => +(i * yStep).toFixed(4));
  return (
    <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Histogram">
      {spec.gridStep &&
        Array.from({ length: Math.round(yMax / spec.gridStep) + 1 }, (_, i) => i * spec.gridStep!).map((t) => (
          <line key={`g${t}`} x1={left} y1={Y(t)} x2={right} y2={Y(t)} stroke="#eef0f4" />
        ))}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={left} y1={Y(t)} x2={right} y2={Y(t)} stroke="#d9dde5" />
          {!spec.hideScale && (
            <text x={left - 6} y={Y(t) + 4} textAnchor="end" className="dtick">
              {t}
            </text>
          )}
        </g>
      ))}
      {spec.classes.map(([a, b], i) =>
        spec.densities[i] === null ? null : <rect key={`b${i}`} x={X(a)} y={Y(spec.densities[i]!)} width={X(b) - X(a)} height={bottom - Y(spec.densities[i]!)} className="dbar" />,
      )}
      <line x1={left} y1={bottom} x2={right} y2={bottom} className="dline" />
      <line x1={left} y1={bottom} x2={left} y2={top} className="dline" />
      {xTicks.map((t) => (
        <text key={`x${t}`} x={X(t)} y={bottom + 16} textAnchor="middle" className="dtick">
          {t}
        </text>
      ))}
      <text x={(left + right) / 2} y={Hd - 6} textAnchor="middle" className="dlabel">
        {spec.xLabel}
      </text>
      <text x={14} y={(top + bottom) / 2} textAnchor="middle" className="dlabel" transform={`rotate(-90 14 ${(top + bottom) / 2})`}>
        {spec.yLabel}
      </text>
    </svg>
  );
}

/** Ticks at multiples of `every` within [a, b], computed in integer steps to avoid drift. */
function ticks(a: number, b: number, every: number): number[] {
  const out: number[] = [];
  for (let k = Math.ceil(a / every - 1e-9); k * every <= b + 1e-9; k++) out.push(+(k * every).toFixed(6));
  return out;
}

function Grid({ spec }: { spec: Extract<DiagramSpec, { type: 'grid' }> }) {
  const [x0, x1] = spec.x;
  const [y0, y1] = spec.y;
  const xs = spec.xStep ?? 1;
  const ys = spec.yStep ?? 1;
  const ml = spec.yLabel ? 54 : 26;
  const mb = spec.xLabel ? 40 : 22;
  const mt = 12;
  const mr = 14;
  const Wd = 380;
  const plotW = Wd - ml - mr;
  const plotH = spec.square ? (plotW * (y1 - y0)) / (x1 - x0) : 240;
  const Hd = plotH + mt + mb;
  const X = (x: number) => ml + ((x - x0) / (x1 - x0)) * plotW;
  const Y = (y: number) => mt + ((y1 - y) / (y1 - y0)) * plotH;
  // Axes through the origin when it is on the grid (transformations), otherwise along the edges.
  const ax = y0 <= 0 && y1 >= 0 ? 0 : y0;
  const ay = x0 <= 0 && x1 >= 0 ? 0 : x0;
  const crossing = ax === 0 && ay === 0 && x0 < 0 && y0 < 0;
  const xLab = ticks(x0, x1, spec.xLabelEvery ?? xs).filter((t) => !(crossing && t === 0));
  const yLab = ticks(y0, y1, spec.yLabelEvery ?? ys).filter((t) => !(crossing && t === 0));
  const fmt = (t: number) => String(t).replace('-', '−');
  return (
    <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Grid">
      {ticks(x0, x1, xs).map((t) => (
        <line key={`gx${t}`} x1={X(t)} y1={Y(y0)} x2={X(t)} y2={Y(y1)} stroke={xLab.includes(t) && spec.xLabelEvery ? '#cfd5df' : '#e3e7ee'} />
      ))}
      {ticks(y0, y1, ys).map((t) => (
        <line key={`gy${t}`} x1={X(x0)} y1={Y(t)} x2={X(x1)} y2={Y(t)} stroke={yLab.includes(t) && spec.yLabelEvery ? '#cfd5df' : '#e3e7ee'} />
      ))}
      <line x1={X(x0)} y1={Y(ax)} x2={X(x1)} y2={Y(ax)} className="dline" />
      <line x1={X(ay)} y1={Y(y0)} x2={X(ay)} y2={Y(y1)} className="dline" />
      {spec.paths?.map((p, i) => {
        const pts = p.points.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
        const cx = p.labelAt?.[0] ?? p.points.reduce((s, q) => s + q[0], 0) / p.points.length;
        const cy = p.labelAt?.[1] ?? p.points.reduce((s, q) => s + q[1], 0) / p.points.length;
        return (
          <g key={`p${i}`}>
            {p.closed ? <polygon points={pts} className="dshape" fill={p.shaded ? '#dce4f2' : 'none'} style={{ fill: p.shaded ? '#dce4f2' : 'none' }} /> : <polyline points={pts} className="dshape" />}
            {p.dots && p.points.map(([x, y], j) => <circle key={j} cx={X(x)} cy={Y(y)} r={2.4} fill="currentColor" />)}
            {p.label && (
              <text x={X(cx)} y={Y(cy) + 5} textAnchor="middle" className="dlabel" fontWeight={600}>
                {p.label}
              </text>
            )}
          </g>
        );
      })}
      {xLab.map((t) => (
        <text key={`lx${t}`} x={X(t)} y={Y(ax) + 14} textAnchor="middle" className="dtick dhalo">
          {fmt(t)}
        </text>
      ))}
      {yLab.map((t) => (
        <text key={`ly${t}`} x={X(ay) - 5} y={Y(t) + 4} textAnchor="end" className="dtick dhalo">
          {fmt(t)}
        </text>
      ))}
      {crossing && (
        <>
          <text x={X(0) - 5} y={Y(0) + 14} textAnchor="end" className="dtick dhalo">
            O
          </text>
          <text x={X(x1) - 4} y={Y(0) - 6} textAnchor="end" className="dlabel" fontStyle="italic">
            x
          </text>
          <text x={X(0) + 6} y={Y(y1) + 12} className="dlabel" fontStyle="italic">
            y
          </text>
        </>
      )}
      {spec.xLabel && (
        <text x={ml + plotW / 2} y={Hd - 6} textAnchor="middle" className="dlabel">
          {spec.xLabel}
        </text>
      )}
      {spec.yLabel && (
        <text x={14} y={mt + plotH / 2} textAnchor="middle" className="dlabel" transform={`rotate(-90 14 ${mt + plotH / 2})`}>
          {spec.yLabel}
        </text>
      )}
    </svg>
  );
}

/** A probability on a branch: 'a/b' stacked as a fraction, '' as a dotted blank. */
function ProbSvg({ x, y, p }: { x: number; y: number; p: string }) {
  if (p === '') return <line x1={x - 16} y1={y + 2} x2={x + 16} y2={y + 2} stroke="currentColor" strokeDasharray="2 3" />;
  const m = /^(\d+)\/(\d+)$/.exec(p);
  if (!m) {
    return (
      <text x={x} y={y} textAnchor="middle" className="dlabel">
        {p}
      </text>
    );
  }
  const w = Math.max(m[1].length, m[2].length) * 4.5 + 3;
  return (
    <g className="dlabel">
      <text x={x} y={y - 9} textAnchor="middle" className="dprob">
        {m[1]}
      </text>
      <line x1={x - w} y1={y - 5} x2={x + w} y2={y - 5} stroke="currentColor" strokeWidth={1} />
      <text x={x} y={y + 8} textAnchor="middle" className="dprob">
        {m[2]}
      </text>
    </g>
  );
}

function Tree({ spec }: { spec: Extract<DiagramSpec, { type: 'tree' }> }) {
  const Wd = 400;
  const n1 = spec.first.length;
  const n2 = Math.max(...spec.second.map((s) => s.length));
  const leaves = n1 * n2;
  const Hd = Math.max(200, leaves * 40 + (spec.stages ? 30 : 10));
  const top = spec.stages ? 30 : 10;
  const leafY = (i: number) => top + ((i + 0.5) * (Hd - top)) / leaves;
  const root: [number, number] = [16, (top + Hd) / 2];
  const midX = 150;
  const endX = 300;
  // Each first-stage node sits in the middle of its own leaves.
  const nodeY = spec.first.map((_, i) => (leafY(i * n2) + leafY(i * n2 + n2 - 1)) / 2);
  const branch = (a: [number, number], b: [number, number], p: string, key: string) => {
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const up = b[1] < a[1];
    return (
      <g key={key}>
        <line x1={a[0]} y1={a[1]} x2={b[0] - 6} y2={b[1]} className="dline" />
        <ProbSvg x={mx} y={up ? my - 10 : my + 20} p={p} />
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Tree diagram">
      {spec.stages && (
        <>
          <text x={(root[0] + midX) / 2 + 20} y={16} textAnchor="middle" className="dtick">
            {spec.stages[0]}
          </text>
          <text x={(midX + endX) / 2 + 40} y={16} textAnchor="middle" className="dtick">
            {spec.stages[1]}
          </text>
        </>
      )}
      {spec.first.map((f, i) => (
        <g key={`f${i}`}>
          {branch(root, [midX, nodeY[i]], f.p, `fb${i}`)}
          <text x={midX} y={nodeY[i] + 5} className="dlabel">
            {f.label}
          </text>
          {spec.second[i].map((s, j) => {
            const ly = leafY(i * n2 + j);
            return (
              <g key={`s${i}${j}`}>
                {branch([midX + 8 + f.label.length * 7.5, nodeY[i]], [endX, ly], s.p, `sb${i}${j}`)}
                <text x={endX} y={ly + 5} className="dlabel">
                  {s.label}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function Venn({ spec }: { spec: Extract<DiagramSpec, { type: 'venn' }> }) {
  const Wd = 380;
  const Hd = 230;
  const r = 80;
  const ca: [number, number] = [148, 122];
  const cb: [number, number] = [232, 122];
  const block = (x: number, y: number, s: string, key: string) => {
    const ls = s.split('\n');
    return (
      <g key={key}>
        {ls.map((l, i) => (
          <MathSvgText key={i} x={x} y={y + 5 + (i - (ls.length - 1) / 2) * 18} text={l} />
        ))}
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Venn diagram">
      <rect x={6} y={6} width={Wd - 12} height={Hd - 12} className="dshape" />
      <text x={16} y={26} className="dlabel" fontStyle="italic">
        ξ
      </text>
      <circle cx={ca[0]} cy={ca[1]} r={r} className="dshape" />
      <circle cx={cb[0]} cy={cb[1]} r={r} className="dshape" />
      <text x={ca[0] - r * 0.75} y={ca[1] - r * 0.78} textAnchor="end" className="dlabel">
        {spec.sets[0]}
      </text>
      <text x={cb[0] + r * 0.75} y={cb[1] - r * 0.78} className="dlabel">
        {spec.sets[1]}
      </text>
      {block(ca[0] - 34, ca[1], spec.regions.a, 'a')}
      {block((ca[0] + cb[0]) / 2, ca[1], spec.regions.both, 'ab')}
      {block(cb[0] + 34, cb[1], spec.regions.b, 'b')}
      {block(Wd - 40, Hd - 26, spec.regions.neither, 'n')}
    </svg>
  );
}

function Pie({ spec }: { spec: Extract<DiagramSpec, { type: 'pie' }> }) {
  // Names go outside the circle (they can be wider than a sector); angles go inside.
  const Wd = 440;
  const r = 88;
  const top = spec.title ? 52 : 30;
  const Hd = top + 2 * r + 30;
  const cx = Wd / 2;
  const cy = top + r;
  // Bearing-style angles: 0° at the top, clockwise.
  const at = (deg: number, rr: number): [number, number] => [cx + rr * Math.sin((deg * Math.PI) / 180), cy - rr * Math.cos((deg * Math.PI) / 180)];
  let start = 0;
  return (
    <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Pie chart">
      {spec.title && (
        <text x={cx} y={18} textAnchor="middle" className="dlabel" fontWeight={600}>
          {spec.title}
        </text>
      )}
      <circle cx={cx} cy={cy} r={r} className="dshape" />
      {spec.sectors.map((s, i) => {
        const a0 = start;
        start += s.angle;
        const [x, y] = at(a0, r);
        const mid = a0 + s.angle / 2;
        const sin = Math.sin((mid * Math.PI) / 180);
        const cos = Math.cos((mid * Math.PI) / 180);
        const [lx, ly] = at(mid, r + 12);
        const anchor = Math.abs(sin) < 0.25 ? 'middle' : sin > 0 ? 'start' : 'end';
        // Labels above the circle sit on their baseline; labels below hang down.
        const dy = cos > 0.5 ? -2 : cos < -0.5 ? 12 : 5;
        const inside = s.angle >= 28;
        const [ax, ay] = at(mid, r * 0.6);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} className="dline" />
            <text x={lx} y={ly + dy} textAnchor={anchor} className="dlabel">
              {s.label}
              {s.showAngle && !inside ? ` (${s.angle}°)` : ''}
            </text>
            {s.showAngle && inside && (
              <text x={ax} y={ay + 5} textAnchor="middle" className="dlabel" fontSize={13}>
                {s.angle}°
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
