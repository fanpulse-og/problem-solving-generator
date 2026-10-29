import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, single, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp, roundFloatSf } from '../../engine/format';
import { names } from '../../contexts/names';

/**
 * Right-angled trigonometry in context. Foundational: one side and one angle
 * from a labelled triangle; core: a ladder safety rule (decide); stretch: an
 * angle of elevation seen from two points, which needs the height first.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  // foundational
  hyp: number;
  angle: number; // degrees
  adj2: number; // (b): adjacent
  opp2: number; // (b): opposite
  // core: ladder
  L: number; // metres, 1 d.p.
  d: number;
  rule: [number, number];
  // stretch
  dist: number;
  back: number;
  elev: number;
  thing: string;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const t4 = (x: number) => `${(Math.floor(x * 1e4) / 1e4).toFixed(4)}…`;
const ladderAngle = (v: V) => deg(Math.acos(v.d / v.L));

export default defineTemplate<V>({
  id: 'geom-right-trig',
  title: 'Right-angled trigonometry in context',
  strand: 'Geometry & Measures',
  subtopic: 'Trigonometry',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { core: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, hyp: 0, angle: 0, adj2: 0, opp2: 0, L: 0, d: 0, rule: [70, 80], dist: 0, back: 0, elev: 0, thing: '' };
    if (level === 'foundational') {
      const hyp = rng.int(6, 25);
      const angle = rng.int(20, 70);
      const adj2 = rng.int(4, 15);
      const opp2 = rng.int(4, 15);
      ensure(adj2 !== opp2, 'not a 45° triangle');
      const v = { ...base, hyp, angle, adj2, opp2 };
      const a = roundFloatSf(hyp * Math.sin(rad(angle)), 3);
      const b = roundFloatDp(deg(Math.atan(opp2 / adj2)), 1);
      ensure(!/\.0$/.test(a) && !/\.0$/.test(b), 'avoid trailing zeros');
      return v;
    }
    if (level === 'core') {
      const L = rng.int(35, 90) / 10;
      const d = rng.int(5, 30) / 10;
      const v = { ...base, L, d, rule: [rng.pick([65, 70]), rng.pick([75, 80])] as [number, number] };
      const ang = ladderAngle(v);
      ensure(ang > 55 && ang < 88, 'a realistic ladder');
      ensure(Math.abs(ang - v.rule[0]) > 0.3 && Math.abs(ang - v.rule[1]) > 0.3, 'not borderline');
      ensure(!roundFloatDp(ang, 1).endsWith('.0'), 'avoid trailing zero');
      return v;
    }
    const dist = rng.int(15, 60);
    const back = rng.int(10, 40);
    const elev = rng.int(25, 60);
    const v = { ...base, dist, back, elev, thing: rng.pick(['tree', 'tower', 'flagpole', 'lighthouse']) };
    const h = dist * Math.tan(rad(elev));
    const beta = deg(Math.atan(h / (dist + back)));
    ensure(!roundFloatDp(beta, 1).endsWith('.0'), 'avoid trailing zero');
    roundFloatSf(h, 3);
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'core' && v.d >= v.L) p.push('ladder foot too far');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      const s = Math.sin(rad(v.angle));
      const c = Math.cos(rad(v.angle));
      const tri1 = diagram({
        type: 'figure',
        points: { A: [0, 0], B: [v.hyp * c, 0], C: [v.hyp * c, v.hyp * s] },
        segments: [['A', 'B'], ['B', 'C'], ['C', 'A']],
        rightAngles: [{ at: 'B', from: 'A', to: 'C' }],
        angles: [{ at: 'A', from: 'B', to: 'C', text: `${v.angle}°` }],
        edgeLabels: [{ a: 'A', b: 'C', text: `${v.hyp} cm` }, { a: 'B', b: 'C', text: 'x cm' }],
        notAccurate: true,
      });
      const tri2 = diagram({
        type: 'figure',
        points: { P: [0, 0], Q: [v.adj2, 0], R: [v.adj2, v.opp2] },
        segments: [['P', 'Q'], ['Q', 'R'], ['R', 'P']],
        rightAngles: [{ at: 'Q', from: 'P', to: 'R' }],
        angles: [{ at: 'P', from: 'Q', to: 'R', text: 'y°' }],
        edgeLabels: [{ a: 'P', b: 'Q', text: `${v.adj2} cm` }, { a: 'Q', b: 'R', text: `${v.opp2} cm` }],
        notAccurate: true,
      });
      return {
        stem: [],
        parts: [
          part('a', 2, text('ABC is a right-angled triangle.'), tri1, text('Work out the value of $x$'), text('Give your answer correct to 3 significant figures.')),
          part('b', 2, text('PQR is a right-angled triangle.'), tri2, text('Work out the value of $y$'), text('Give your answer correct to 1 decimal place.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [
          ...lines(`${v.name} leans a ladder of length ${v.L} m against a vertical wall.`, `The foot of the ladder is on horizontal ground, ${v.d} m from the bottom of the wall.`, `For the ladder to be safe, the angle between the ladder and the ground must be between ${v.rule[0]}° and ${v.rule[1]}°.`),
          diagram({ type: 'figure', points: { _F: [0, 0], _W: [v.d, 0], _T: [v.d, Math.sqrt(v.L * v.L - v.d * v.d)] }, segments: [['_F', '_W'], ['_W', '_T'], ['_T', '_F']], rightAngles: [{ at: '_W', from: '_F', to: '_T' }], edgeLabels: [{ a: '_F', b: '_T', text: `${v.L} m` }, { a: '_F', b: '_W', text: `${v.d} m` }], notAccurate: true }),
        ],
        parts: [single(3, text(`Is ${v.name}’s ladder safe?`), text('You must show how you get your answer.'))],
      };
    }
    const h = v.dist * Math.tan(rad(v.elev));
    return {
      stem: [
        ...lines(`A ${v.thing} stands on horizontal ground.`, `From point P, ${v.dist} m from the foot of the ${v.thing}, the angle of elevation of the top of the ${v.thing} is ${v.elev}°.`, `Point Q is a further ${v.back} m from the ${v.thing}, in a straight line with P and the foot of the ${v.thing}.`),
        diagram({
          type: 'figure',
          points: { Q: [0, 0], P: [v.back, 0], F: [v.back + v.dist, 0], T: [v.back + v.dist, h] },
          segments: [['Q', 'F'], ['F', 'T'], ['T', 'P'], ['T', 'Q']],
          rightAngles: [{ at: 'F', from: 'P', to: 'T' }],
          angles: [{ at: 'P', from: 'F', to: 'T', text: `${v.elev}°` }],
          edgeLabels: [{ a: 'Q', b: 'P', text: `${v.back} m` }, { a: 'P', b: 'F', text: `${v.dist} m` }],
          notAccurate: true,
        }),
      ],
      parts: [single(4, text(`Work out the angle of elevation of the top of the ${v.thing} from point Q.`), text('Give your answer correct to 1 decimal place.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$x$ = ${roundFloatSf(v.hyp * Math.sin(rad(v.angle)), 3)}` }, { text: `$y$ = ${roundFloatDp(deg(Math.atan(v.opp2 / v.adj2)), 1)}` }];
    if (v.level === 'core') {
      const a = ladderAngle(v);
      const safe = a > v.rule[0] && a < v.rule[1];
      return [{ text: `${safe ? 'Yes' : 'No'}: the angle is ${roundFloatDp(a, 1)}°, which is ${safe ? '' : 'not '}between ${v.rule[0]}° and ${v.rule[1]}°` }];
    }
    const h = v.dist * Math.tan(rad(v.elev));
    return [{ text: `${roundFloatDp(deg(Math.atan(h / (v.dist + v.back))), 1)}°` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('M1', `$\\sin ${v.angle}° = \\frac{x}{${v.hyp}}$, so $x = ${v.hyp} \\sin ${v.angle}°$`, 'x is opposite the angle and the hypotenuse is given: use SOH.'), step('A1', roundFloatSf(v.hyp * Math.sin(rad(v.angle)), 3), 'Round to 3 significant figures.')],
        [step('M1', `$\\tan y = \\frac{${v.opp2}}{${v.adj2}}$, so $y = \\tan^{-1}\\left(\\frac{${v.opp2}}{${v.adj2}}\\right)$`, 'Opposite and adjacent are given: use TOA, then the inverse.'), step('A1', roundFloatDp(deg(Math.atan(v.opp2 / v.adj2)), 1), 'Round to 1 decimal place.')],
      ];
    }
    if (v.level === 'core') {
      const a = ladderAngle(v);
      const safe = a > v.rule[0] && a < v.rule[1];
      return [
        [
          step('M1', `$\\cos \\theta = \\frac{${v.d}}{${v.L}}$`, 'The distance from the wall is adjacent to the angle; the ladder is the hypotenuse.'),
          step('A1', `$\\theta = \\cos^{-1}\\left(\\frac{${v.d}}{${v.L}}\\right)$ = ${roundFloatDp(a, 1)}°`, 'Use the inverse cosine.'),
          step('C1', `${roundFloatDp(a, 1)}° is ${safe ? '' : 'not '}between ${v.rule[0]}° and ${v.rule[1]}°, so the ladder is ${safe ? '' : 'not '}safe`, 'Compare with the rule and give a clear conclusion.'),
        ],
      ];
    }
    const h = v.dist * Math.tan(rad(v.elev));
    const beta = deg(Math.atan(h / (v.dist + v.back)));
    return [
      [
        step('M1', `height = ${v.dist} × tan ${v.elev}°`, 'In the triangle at P, the height is opposite and the distance is adjacent.'),
        step('A1', `height = ${t4(h)} m`, 'Keep the full value in your calculator.'),
        step('M1', `$\\tan \\beta = \\frac{${t4(h).replace('…', '')}…}{${v.dist + v.back}}$`, `From Q the adjacent side is ${v.dist} + ${v.back} = ${v.dist + v.back} m.`),
        step('A1', `$\\beta$ = ${roundFloatDp(beta, 1)}°`, 'Use the inverse tangent and round at the end.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const near = (shown: string, x: number, tol: number) => Math.abs(parseFloat(shown.replace(/[^\d.]/g, '')) - x) <= tol;
    if (v.level === 'foundational') {
      // Use the cosine of the other angle / Pythagoras instead.
      const x = v.hyp * Math.cos(rad(90 - v.angle));
      const y = 90 - deg(Math.atan(v.adj2 / v.opp2));
      if (!near(answers[0].text, x, 0.05 * 10 ** (Math.floor(Math.log10(x)) - 1) * 10 + 1e-9) || !near(answers[1].text, y, 0.05 + 1e-9)) p.push('foundational');
    } else if (v.level === 'core') {
      const a = 90 - deg(Math.asin(v.d / v.L)); // angle at the top, subtracted from 90
      const safe = a > v.rule[0] && a < v.rule[1];
      if (!answers[0].text.startsWith(safe ? 'Yes' : 'No')) p.push('decision');
    } else {
      // Height by sine rule in triangle PQT: angle PTQ = elev − beta.
      const h = v.dist * Math.tan(rad(v.elev));
      const QT = Math.hypot(v.dist + v.back, h);
      const beta = deg(Math.asin(h / QT));
      if (!near(answers[0].text, beta, 0.05 + 1e-9)) p.push('beta');
    }
    return p;
  },

  key: (v) => `${v.hyp}|${v.angle}|${v.adj2}|${v.opp2}|${v.L}|${v.d}|${v.rule}|${v.dist}|${v.back}|${v.elev}`,
});
