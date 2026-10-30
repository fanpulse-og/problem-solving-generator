import { defineTemplate } from '../../engine/types';
import { part, single, step, text, DIV } from '../../engine/blocks';
import { dec, ensure, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 23 1H Q15 (y inversely proportional to x) and Set 24 1H Q21
 * (P inversely proportional to y², y directly proportional to √x).
 * Foundational: direct proportion; core: powers and roots, then solving
 * backwards; stretch: two linked proportions.
 */
type Kind = 'x' | 'x2' | 'x3' | 'sqrt' | 'inv' | 'inv2' | 'invsqrt';
interface V {
  level: 'foundational' | 'core' | 'stretch';
  kind: Kind;
  k: Q;
  x1: number;
  x2: number; // foundational: find y; core: the answer x
  // stretch: P = k / y², y = m√x
  m: number;
  y1: number;
  xA: number; // x with y known (y = yA)
  x3: number;
}

const F: Record<Kind, { words: string; tex: (k: string) => string; f: (x: Q) => Q }> = {
  x: { words: '$x$', tex: (k) => `${k}x`, f: (x) => x },
  x2: { words: 'the square of $x$', tex: (k) => `${k}x^2`, f: (x) => x.mul(x) },
  x3: { words: 'the cube of $x$', tex: (k) => `${k}x^3`, f: (x) => x.mul(x).mul(x) },
  sqrt: { words: 'the square root of $x$', tex: (k) => `${k}\\sqrt{x}`, f: (x) => sqrtQ(x) },
  inv: { words: '$x$', tex: (k) => `\\frac{${k}}{x}`, f: (x) => Q.of(1).div(x) },
  inv2: { words: 'the square of $x$', tex: (k) => `\\frac{${k}}{x^2}`, f: (x) => Q.of(1).div(x.mul(x)) },
  invsqrt: { words: 'the square root of $x$', tex: (k) => `\\frac{${k}}{\\sqrt{x}}`, f: (x) => Q.of(1).div(sqrtQ(x)) },
};
const inverse = (k: Kind) => k.startsWith('inv');

function sqrtQ(q: Q): Q {
  const r = Math.round(Math.sqrt(q.toNumber()));
  if (!Q.of(r * r).eq(q)) throw new Error('not a perfect square');
  return Q.of(r);
}
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));
const y = (v: V, x: number) => v.k.mul(F[v.kind].f(Q.of(x)));
const formula = (v: V) => `$y = ${F[v.kind].tex(v.k.isInt() ? `${v.k}` : fracTex(v.k))}$`;

export default defineTemplate<V>({
  id: 'ratio-proportion',
  title: 'Direct and inverse proportion',
  strand: 'Ratio & Proportion',
  subtopic: 'Direct & inverse proportion',
  tiers: ['KS3', 'F', 'H'],
  // Proportion to powers and roots is Higher only (R13): the stretch is Higher.
  levelsByTier: { KS3: ['foundational', 'core'], F: ['foundational', 'core'] },
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'either',

  generate({ rng, tier, level }) {
    const base: V = { level, kind: 'x', k: Q.of(1), x1: 0, x2: 0, m: 0, y1: 0, xA: 0, x3: 0 };
    if (level === 'stretch') {
      const m = rng.int(2, 5);
      const k = rng.pick([36, 48, 72, 100, 144, 180, 200, 288]);
      const y1 = rng.pick([2, 3, 4, 5, 6]);
      ensure(k % (y1 * y1) === 0, 'P whole when y = y1');
      const xA = rng.pick([4, 9, 16, 25]);
      const x3 = rng.pick([1, 4, 9, 16, 25, 36].filter((x) => x !== xA));
      return { ...base, k: Q.of(k), m, y1, xA, x3 };
    }
    const kinds: Kind[] = level === 'foundational' || tier !== 'H' ? ['x', 'inv'] : ['x2', 'x3', 'sqrt', 'inv', 'inv2', 'invsqrt'];
    const kind = rng.pick(kinds);
    const sq = kind === 'sqrt' || kind === 'invsqrt';
    const pickX = () => (sq ? rng.pick([1, 4, 9, 16, 25, 36, 49, 64, 100]) : rng.int(2, kind === 'x3' ? 5 : 12));
    const x1 = pickX();
    const x2 = pickX();
    ensure(x1 !== x2 && x1 !== 1, 'different, informative values');
    // k chosen so y at x1 is a whole number (for inverse kinds k = y1 ÷ f(x1)).
    const kDirect = inverse(kind) ? Q.of(rng.int(2, 12)).div(F[kind].f(Q.of(x1))) : Q.of(rng.int(2, 9));
    const v = { ...base, kind, k: kDirect, x1, x2 };
    ensure(v.k.isInt(), 'whole-number constant');
    if (level === 'foundational') ensure(y(v, x2).terminatesWithin(2), 'tidy answer');
    else {
      // Core (b) is solved backwards for x, so y at x2 must be tidy and x2 positive.
      ensure(y(v, x2).terminatesWithin(2), 'tidy given value');
      if (kind === 'x3') ensure(x2 <= 6, 'manageable cube root');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level !== 'stretch' && !y(v, v.x1).isPositive()) p.push('positive values');
    return p;
  },

  render(v) {
    if (v.level === 'stretch') {
      const P1 = v.k.div(v.y1 * v.y1);
      const yA = v.m * Math.sqrt(v.xA);
      return {
        stem: [text('$P$ is inversely proportional to the square of $y$'), text(`When $y = ${v.y1}$, $P = ${dec(P1)}$`), text('$y$ is directly proportional to the square root of $x$'), text(`When $x = ${v.xA}$, $y = ${yA}$`)],
        parts: [single(4, text(`Find the value of $P$ when $x = ${v.x3}$`))],
      };
    }
    const rel = inverse(v.kind) ? 'inversely' : 'directly';
    const stem = [text(`$y$ is ${rel} proportional to ${F[v.kind].words}`), text(`When $x = ${v.x1}$, $y = ${dec(y(v, v.x1))}$`)];
    if (v.level === 'foundational') {
      return { stem, parts: [part('a', 2, text('Find a formula for $y$ in terms of $x$')), part('b', 1, text(`Work out the value of $y$ when $x = ${v.x2}$`))] };
    }
    return { stem, parts: [part('a', 3, text('Find a formula for $y$ in terms of $x$')), part('b', 2, text(`Find the positive value of $x$ when $y = ${dec(y(v, v.x2))}$`))] };
  },

  answer(v) {
    if (v.level === 'stretch') {
      const P3 = v.k.div(v.m * v.m * v.x3);
      return [{ text: `$P = ${P3.terminatesWithin(3) ? dec(P3) : fracTex(P3)}$` }];
    }
    if (v.level === 'foundational') return [{ text: formula(v) }, { text: `$y = ${dec(y(v, v.x2))}$` }];
    return [{ text: formula(v) }, { text: `$x = ${v.x2}$` }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const P1 = v.k.div(v.y1 * v.y1);
      const yA = v.m * Math.sqrt(v.xA);
      const y3 = v.m * Math.sqrt(v.x3);
      const P3 = v.k.div(y3 * y3);
      return [
        [
          step('M1', `$P = \\frac{k}{y^2}$: $${dec(P1)} = \\frac{k}{${v.y1 * v.y1}}$, so $k = ${v.k}$`, 'Write the proportion with a constant, then substitute to find it.'),
          step('M1', `$y = c\\sqrt{x}$: $${yA} = c\\sqrt{${v.xA}}$, so $c = ${v.m}$`, 'Do the same for the second relationship.'),
          step('M1', `When $x = ${v.x3}$: $y = ${v.m}\\sqrt{${v.x3}} = ${y3}$`, 'Use the second formula to get y first.'),
          step('A1', `$P = \\frac{${v.k}}{${y3}^2} = ${P3.terminatesWithin(3) ? dec(P3) : fracTex(P3)}$`, 'Then put that y into the first formula.'),
        ],
      ];
    }
    const kTex = v.k.isInt() ? `${v.k}` : fracTex(v.k);
    const general = `$y = ${F[v.kind].tex('k')}$`;
    const sub = `$${dec(y(v, v.x1))} = ${F[v.kind].tex('k').replace(/x/g, `(${v.x1})`)}$, so $k = ${kTex}$`;
    if (v.level === 'foundational') {
      return [
        [step('M1', `${general}; ${sub}`, 'Write it with a constant k, then substitute the values you know.'), step('A1', formula(v), 'Write the formula with the value of k.')],
        [step('B1', `$y = ${F[v.kind].tex(kTex).replace(/x/g, `(${v.x2})`)} = ${dec(y(v, v.x2))}$`, 'Substitute into your formula.')],
      ];
    }
    const yGiven = y(v, v.x2);
    const back =
      v.kind === 'x' ? `$x = ${dec(yGiven)} ${DIV} ${kTex} = ${v.x2}$`
      : v.kind === 'x2' ? `$x^2 = ${dec(yGiven)} ${DIV} ${kTex} = ${v.x2 * v.x2}$`
      : v.kind === 'x3' ? `$x^3 = ${dec(yGiven)} ${DIV} ${kTex} = ${v.x2 ** 3}$`
      : v.kind === 'sqrt' ? `$\\sqrt{x} = ${dec(yGiven)} ${DIV} ${kTex} = ${Math.sqrt(v.x2)}$`
      : v.kind === 'inv' ? `$x = ${kTex} ${DIV} ${dec(yGiven)}$`
      : v.kind === 'inv2' ? `$x^2 = ${kTex} ${DIV} ${dec(yGiven)} = ${v.x2 * v.x2}$`
      : `$\\sqrt{x} = ${kTex} ${DIV} ${dec(yGiven)} = ${Math.sqrt(v.x2)}$`;
    return [
      [step('M1', general, `${inverse(v.kind) ? 'Inversely' : 'Directly'} proportional: put a constant k in the formula.`), step('M1', sub, 'Substitute the pair of values you are given.'), step('A1', formula(v), 'Write the final formula.')],
      [step('M1', back, 'Rearrange your formula to work backwards.'), step('A1', `$x = ${v.x2}$`, 'Check by putting it back into the formula.')],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // P × y² is constant and y ÷ √x is constant: use ratios between cases.
      const y3 = v.m * Math.sqrt(v.x3);
      const yA = v.m * Math.sqrt(v.xA);
      const ratioY = Q.of(y3 * y3, yA * yA); // (y3/yA)²
      const PA = v.k.div(yA * yA);
      const P3 = PA.div(ratioY);
      const want = `$P = ${P3.terminatesWithin(3) ? dec(P3) : fracTex(P3)}$`;
      if (answers[0].text !== want) p.push(`stretch ${answers[0].text} vs ${want}`);
      return p;
    }
    // Scaling check: y(x2) / y(x1) must equal f(x2) / f(x1).
    const r = y(v, v.x2).div(y(v, v.x1));
    if (!r.eq(F[v.kind].f(Q.of(v.x2)).div(F[v.kind].f(Q.of(v.x1))))) p.push('scaling');
    if (v.level === 'core') {
      // Search for the x that gives the stated y.
      let found = 0;
      for (let x = 1; x <= 200; x++) if ((!(v.kind === 'sqrt' || v.kind === 'invsqrt') || isSquare(x)) && y(v, x).eq(y(v, v.x2))) found = x;
      if (answers[1].text !== `$x = ${found}$`) p.push('x');
    }
    return p;
  },

  key: (v) => `${v.kind}|${v.k}|${v.x1}|${v.x2}|${v.m}|${v.y1}|${v.xA}|${v.x3}`,
});
