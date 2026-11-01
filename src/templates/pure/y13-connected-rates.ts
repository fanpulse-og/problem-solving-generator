import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 connected rates of change: a cube growing at a known rate, a
 * sphere being inflated, and a cone-shaped tank where the volume must first be
 * written in terms of the depth alone.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  rate: number;
  x: number;
  p: number;
  q: number; // stretch: radius = (p/q) × depth
}

export default defineTemplate<V>({
  id: 'y13-connected-rates',
  title: 'Connected rates of change',
  strand: 'Pure',
  subtopic: 'Differentiation',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    if (level === 'foundational') return { level, rate: rng.int(1, 5), x: rng.int(2, 12), p: 0, q: 0 };
    if (level === 'core') {
      const rate = rng.step(20, 200, 10);
      const x = rng.int(3, 15);
      sf3(rate / (4 * Math.PI * x * x));
      return { level, rate, x, p: 0, q: 0 };
    }
    const [p, q] = rng.pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5]] as [number, number][]);
    const rate = rng.step(10, 90, 5);
    const x = rng.int(4, 20);
    sf3((rate * q * q) / (Math.PI * p * p * x * x));
    ensure(p < q, 'a tall narrow tank');
    return { level, rate, x, p, q };
  },

  validate(v) {
    return v.rate > 0 && v.x > 0 ? [] : ['rates and lengths must be positive'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines('The side length of a cube is increasing.', `At time $t$ seconds the side length is $x$ cm, and $x$ is increasing at a constant rate of ${v.rate} cm s$^{-1}$`),
        parts: [
          part('a', 3, text(`Find the rate of increase of the volume of the cube when  $x = ${v.x}$`)),
          part('b', 2, text(`Find the rate of increase of the surface area of the cube when  $x = ${v.x}$`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`Air is pumped into a spherical balloon at a constant rate of ${v.rate} cm³ s$^{-1}$`),
        parts: [single(4, text(`Find the rate of increase of the radius at the instant when the radius is ${v.x} cm, giving your answer to 3 significant figures.`))],
      };
    }
    return {
      stem: lines(
        'A tank is in the shape of an inverted right circular cone with its axis vertical.',
        `When the depth of the water is $h$ cm, the radius of the water surface is $${fracTex(Q.of(v.p, v.q))}h$ cm.`,
        `Water flows into the tank at a constant rate of ${v.rate} cm³ s$^{-1}$`,
      ),
      parts: [
        part('a', 2, text(`Show that the volume of water in the tank is  $V = ${fracTex(Q.of(v.p * v.p, 3 * v.q * v.q))}\\pi h^3$`)),
        part('b', 3, text(`Find the rate at which the depth is increasing when  $h = ${v.x}$,  giving your answer to 3 significant figures.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${3 * v.x * v.x * v.rate} cm³ s$^{-1}$` }, { text: `${12 * v.x * v.rate} cm² s$^{-1}$` }];
    if (v.level === 'core') return [{ text: `${sf3(v.rate / (4 * Math.PI * v.x * v.x))} cm s$^{-1}$` }];
    return [{ text: 'Shown' }, { text: `${sf3((v.rate * v.q * v.q) / (Math.PI * v.p * v.p * v.x * v.x))} cm s$^{-1}$` }];
  },

  markScheme(v) {
    const chain = '\\frac{\\mathrm{d}V}{\\mathrm{d}t}';
    if (v.level === 'foundational') {
      return [
        [
          step('M1', '$V = x^3$, so $\\frac{\\mathrm{d}V}{\\mathrm{d}x} = 3x^2$', 'Write the volume in terms of x and differentiate.'),
          step('M1', `$${chain} = \\frac{\\mathrm{d}V}{\\mathrm{d}x} \\times \\frac{\\mathrm{d}x}{\\mathrm{d}t} = 3 \\times ${v.x}^2 \\times ${v.rate}$`, 'Chain rule: this links the two rates.'),
          step('A1', `${3 * v.x * v.x * v.rate} cm³ s$^{-1}$`, 'Give the units of a rate.'),
        ],
        [step('M1', `$A = 6x^2$, so $\\frac{\\mathrm{d}A}{\\mathrm{d}t} = 12x \\times ${v.rate}$`, 'A cube has six square faces.'), step('A1', `${12 * v.x * v.rate} cm² s$^{-1}$`, `Use x = ${v.x}.`)],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('B1', '$V = \\frac{4}{3}\\pi r^3$, so $\\frac{\\mathrm{d}V}{\\mathrm{d}r} = 4\\pi r^2$', 'The formula is in the booklet.'),
          step('M1', `$${chain} = \\frac{\\mathrm{d}V}{\\mathrm{d}r} \\times \\frac{\\mathrm{d}r}{\\mathrm{d}t}$`, 'Chain rule.'),
          step('M1', `$\\frac{\\mathrm{d}r}{\\mathrm{d}t} = \\frac{${v.rate}}{4\\pi \\times ${v.x}^2}$`, 'Rearrange and substitute.'),
          step('A1', `${sf3(v.rate / (4 * Math.PI * v.x * v.x))} cm s$^{-1}$`, 'To 3 significant figures.'),
        ],
      ];
    }
    const k = Q.of(v.p * v.p, v.q * v.q);
    return [
      [step('M1', `$V = \\frac{1}{3}\\pi\\left(${fracTex(Q.of(v.p, v.q))}h\\right)^2 h$`, 'Volume of a cone, with the radius written in terms of h.'), step('A1', `$V = ${fracTex(Q.of(v.p * v.p, 3 * v.q * v.q))}\\pi h^3$`, 'Square the whole bracket. This is the printed answer.')],
      [
        step('M1', `$\\frac{\\mathrm{d}V}{\\mathrm{d}h} = ${fracTex(k)}\\pi h^2$`, 'Differentiate with respect to h.'),
        step('M1', `$\\frac{\\mathrm{d}h}{\\mathrm{d}t} = ${v.rate} \\div \\left(${fracTex(k)}\\pi \\times ${v.x}^2\\right)$`, 'Chain rule, then substitute.'),
        step('A1', `${sf3((v.rate * v.q * v.q) / (Math.PI * v.p * v.p * v.x * v.x))} cm s$^{-1}$`, 'To 3 significant figures.'),
      ],
    ];
  },

  check(v, answers) {
    // A small time step: how far the length moves when the volume changes by a little.
    const dt = 1e-4;
    if (v.level === 'foundational') {
      const V = (x: number) => x ** 3;
      const r = (V(v.x + v.rate * dt) - V(v.x - v.rate * dt)) / (2 * dt);
      return Math.abs(r - 3 * v.x * v.x * v.rate) < 1e-3 ? [] : ['volume rate'];
    }
    const invert = (vol: number) => (v.level === 'core' ? Math.cbrt((3 * vol) / (4 * Math.PI)) : Math.cbrt((vol * 3 * v.q * v.q) / (Math.PI * v.p * v.p)));
    const V0 = v.level === 'core' ? (4 / 3) * Math.PI * v.x ** 3 : (((v.p * v.p) / (3 * v.q * v.q)) * Math.PI) * v.x ** 3;
    const r = (invert(V0 + v.rate * dt) - invert(V0 - v.rate * dt)) / (2 * dt);
    const shown = Number(answers[answers.length - 1].text.split(' ')[0]);
    return Math.abs(r - shown) / r < 0.01 ? [] : ['rate'];
  },

  key: (v) => `${v.rate}|${v.x}|${v.p}|${v.q}`,
});
