import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/21 probability (June 2025 Q5): independent events, a Venn diagram
 * with unknown probabilities, and independence leading to a quadratic in P(A).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  pa: Q;
  pb: Q;
  d: Q;
}

const both = (v: V) => v.pa.mul(v.pb);
const either = (v: V) => v.pa.add(v.pb).sub(both(v));

export default defineTemplate<V>({
  id: 'y12-probability',
  title: 'Independent events and Venn diagrams',
  strand: 'Statistics',
  subtopic: 'Probability',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const pa = Q.of(rng.int(1, 8), 10);
    if (level === 'stretch') {
      const d = Q.of(rng.int(1, 4), 10);
      const pb = pa.add(d);
      ensure(pb.lt(1), 'P(B) is a probability');
      return { level, pa, pb, d };
    }
    const pb = Q.of(rng.int(1, 8), 10);
    ensure(!pa.eq(pb), 'different probabilities');
    return { level, pa, pb, d: Q.of(0) };
  },

  validate(v) {
    return v.pa.lt(1) && v.pb.lt(1) ? [] : ['probabilities must be below 1'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines('The events $A$ and $B$ are independent.', `$\\mathrm{P}(A) = ${dec(v.pa)}$  and  $\\mathrm{P}(B) = ${dec(v.pb)}$`),
        parts: [
          part('a', 1, text('Find  $\\mathrm{P}(A \\cap B)$')),
          part('b', 2, text('Find  $\\mathrm{P}(A \\cup B)$')),
          part('c', 1, text('Find the probability that neither event occurs.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [
          diagram({ type: 'venn', sets: ['A', 'B'], regions: { a: 'p', both: 'q', b: 'r', neither: 's' } }),
          ...lines('The Venn diagram shows the probabilities $p$, $q$, $r$ and $s$ for the events $A$ and $B$.', `$\\mathrm{P}(A) = ${dec(v.pa)}$  and  $\\mathrm{P}(B) = ${dec(v.pb)}$,  and the events $A$ and $B$ are independent.`),
        ],
        parts: [
          part('a', 2, text('Find the value of $q$')),
          part('b', 2, text('Find the values of $p$ and $r$')),
          part('c', 1, text('Find the value of $s$')),
          part('d', 1, text('Find  $\\mathrm{P}(A \\cup B\')$')),
        ],
      };
    }
    return {
      stem: lines('The events $A$ and $B$ are independent.', `$\\mathrm{P}(B) = \\mathrm{P}(A) + ${dec(v.d)}$  and  $\\mathrm{P}(A \\cup B) = ${dec(either(v))}$`),
      parts: [
        part('a', 3, text(`Writing  $\\mathrm{P}(A) = x$,  show that  $x^2 - ${dec(Q.of(2).sub(v.d))}x + ${dec(either(v).sub(v.d))} = 0$`)),
        part('b', 3, text('Hence find  $\\mathrm{P}(A)$  and  $\\mathrm{P}(B)$')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: dec(both(v)) }, { text: dec(either(v)) }, { text: dec(Q.of(1).sub(either(v))) }];
    if (v.level === 'core') {
      return [{ text: `$q = ${dec(both(v))}$` }, { text: `$p = ${dec(v.pa.sub(both(v)))}$, $r = ${dec(v.pb.sub(both(v)))}$` }, { text: `$s = ${dec(Q.of(1).sub(either(v)))}$` }, { text: dec(Q.of(1).sub(v.pb.sub(both(v)))) }];
    }
    return [{ text: 'Shown' }, { text: `$\\mathrm{P}(A) = ${dec(v.pa)}$, $\\mathrm{P}(B) = ${dec(v.pb)}$` }];
  },

  markScheme(v) {
    const [a, b] = [dec(v.pa), dec(v.pb)];
    if (v.level === 'foundational') {
      return [
        [step('B1', `$${a} \\times ${b} = ${dec(both(v))}$`, 'Independent events: multiply.')],
        [step('M1', `$${a} + ${b} - ${dec(both(v))}$`, 'Addition rule: the overlap has been counted twice.'), step('A1', dec(either(v)), 'Work it out.')],
        [step('B1', `$1 - ${dec(either(v))} = ${dec(Q.of(1).sub(either(v)))}$`, 'Neither is the complement of either.')],
      ];
    }
    if (v.level === 'core') {
      const r = v.pb.sub(both(v));
      return [
        [step('M1', `$q = \\mathrm{P}(A) \\times \\mathrm{P}(B) = ${a} \\times ${b}$`, 'q is the overlap, and the events are independent.'), step('A1', `$q = ${dec(both(v))}$`, 'Work it out.')],
        [step('M1', `$p = ${a} - ${dec(both(v))}$`, 'A is made up of p and q.'), step('A1', `$p = ${dec(v.pa.sub(both(v)))}$, $r = ${dec(r)}$`, 'B is made up of q and r.')],
        [step('B1', `$s = ${dec(Q.of(1).sub(either(v)))}$`, 'All four regions add up to 1.')],
        [step('B1', `$1 - r = ${dec(Q.of(1).sub(r))}$`, 'Everything except the part of B outside A.')],
      ];
    }
    const u = either(v);
    return [
      [
        step('M1', `$x(x + ${dec(v.d)})$`, 'For independent events, P(A ∩ B) is the product.'),
        step('M1', `$x + (x + ${dec(v.d)}) - x(x + ${dec(v.d)}) = ${dec(u)}$`, 'Use the addition rule.'),
        step('A1', `$x^2 - ${dec(Q.of(2).sub(v.d))}x + ${dec(u.sub(v.d))} = 0$`, 'Expand and collect. This is the printed answer.'),
      ],
      [
        step('M1', 'Solve the quadratic with the formula or your calculator', 'One root is more than 1.'),
        step('A1', `$\\mathrm{P}(A) = ${a}$`, 'A probability cannot be more than 1, so reject the other root.'),
        step('A1', `$\\mathrm{P}(B) = ${b}$`, `Add ${dec(v.d)}.`),
      ],
    ];
  },

  check(v) {
    // Count outcomes on a 100 × 100 grid: exact for tenths.
    const na = Math.round(v.pa.toNumber() * 100);
    const nb = Math.round(v.pb.toNumber() * 100);
    let any = 0;
    let two = 0;
    for (let i = 0; i < 100; i++) for (let j = 0; j < 100; j++) {
      const [x, y] = [i < na, j < nb];
      if (x || y) any++;
      if (x && y) two++;
    }
    if (!Q.of(any, 10000).eq(either(v)) || !Q.of(two, 10000).eq(both(v))) return ['grid'];
    if (v.level === 'stretch') {
      const [p, u] = [v.pa, either(v)];
      const other = Q.of(2).sub(v.d).sub(p);
      if (!p.mul(p).sub(Q.of(2).sub(v.d).mul(p)).add(u.sub(v.d)).eq(0)) return ['root'];
      return other.gt(1) || other.eq(1) ? [] : ['the other root must be impossible'];
    }
    return [];
  },

  key: (v) => `${v.pa}|${v.pb}|${v.d}`,
});
