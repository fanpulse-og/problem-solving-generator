import { describe, expect, it } from 'vitest';
import { questionFromCode } from '../src/state';

/**
 * Questions whose answers were worked out by hand. If a change to a template
 * alters any of these, the change must be re-checked by a person before the
 * expected answer is updated.
 */
const GOLDEN: [code: string, answers: string[], working: string][] = [
  ['num-ticket-price.core.F.nc.p0', ['£11.50'], '270 tickets, ⅓ child = 90, 180 adult × £17 = £3060; (£4095 − £3060) ÷ 90 = £11.50'],
  ['num-fraction-left.core.F.nc.p0', ['$\\frac{4}{9}$'], '90 − 15 − 9 − 26 = 40; 40/90 = 4/9'],
  ['num-fraction-left.stretch.H.c.p0', ['264'], '1 − ⅓ − ¼ = 5/12; (70 + 40) ÷ 5/12 = 264'],
  ['alg-sequence-explain.stretch.H.c.p0', ['Pattern number 22, with 2 sticks left over'], '9n − 8 ≤ 192 → n = 22 uses 190'],
  ['alg-equal-cost.core.F.nc.p0', ['$k$ = 15'], '⅗ × £1105 = £663; (780 − 663)/780 = 15%'],
  ['geom-paint-floor.core.F.nc.p0', ['£287'], '14×8 + ½×8×8 = 144 m²; 144/11 → 14 tins × £20.50'],
  ['geom-isosceles-area.core.F.nc.p0', ['120 cm²'], 'sides 17, half-base 15, height 8; ½ × 30 × 8'],
  ['geom-semicircle-shapes.stretch.H.c.p0', ['308 cm²', '110 cm'], '462 − 49π = 308.06; 66 + 14π = 109.98'],
  ['prob-missing-expected.stretch.F.nc.p0', ['120'], '1 − 0.75 = 0.25 = 5x; red 0.2 × 600'],
  ['prob-algebra-table.core.H.c.p0', ['40'], '5x = 0.2, x = 0.04, 4x = 0.16; 75 ÷ 0.3 = 250; 0.16 × 250'],
  ['prob-algebra-table.stretch.H.c.p0', ['$\\frac{1}{30}$'], 'red 36, x = 30, blue 20, green 60, yellow 4 of 120'],
  ['stats-mean-missing.stretch.H.c.p0', ['$x$ = 5'], '5x + 30 = 55'],
  ['stats-combined-mean.core.H.c.p0', ['56.7 minutes'], '(570 + 1470) ÷ 36 = 56.67'],
  ['stats-combined-mean.stretch.F.nc.p0', ['76 runs'], '31 × 57 − 19 × 45 = 912; 912 ÷ 12'],
  // Batch 2
  ['ratio-reverse-percentage.core.H.c.p0', ['£72.50'], '£56.55 ÷ 0.78'],
  ['ratio-interest-compare.core.F.c.p0', ['£23.06'], '£4000 × 1.042² = £4343.06; 343.06 − 4000 × 0.04 × 2'],
  ['ratio-interest-compare.stretch.H.c.p0', ['3 years'], '12 500 × 0.87² = 9461.25 ≥ 8500; × 0.87 = 8231.29 < 8500'],
  ['ratio-percentage-change-area.core.H.c.p0', ['23.8% decrease'], '1.27 × 0.6 = 0.762'],
  ['ratio-percentage-change-area.stretch.H.c.p0', ['10% increase'], '0.957 ÷ 0.87 = 1.1'],
  ['ratio-density.core.H.c.p0', ['10.4 g/cm³'], '9920 ÷ (81π + 700) = 10.39'],
  ['ratio-speed-journey.core.F.nc.p0', ['09 40'], '45 ÷ 30 = 1 h 30 min, + 25 min from 07 45'],
  ['ratio-speed-journey.stretch.F.nc.p0', ['21 km/h'], '(23 + 40) ÷ 3'],
  ['ratio-best-buy.stretch.F.c.p0', ['Shop A, by £2.28 (A: £18.00, B: £20.28)'], '15 × £1.20 vs 20 × £1.30 × 0.78'],
  ['num-packs-cost.core.F.nc.p0', ['£34.50'], '222 ÷ 10 → 23 packs × £1.50'],
  ['num-packs-cost.stretch.H.c.p0', ['£32.74 (4 packs of 8 and 2 packs of 20)'], '72 = 4×8 + 2×20 (£32.74) or 9×8 (£37.53)'],
  ['num-as-many-as-possible.foundational.F.c.p0', ['15 tins', '375 g'], '9000 ÷ 575 = 15.65; 9000 − 8625'],
  ['num-as-many-as-possible.stretch.F.c.p0', ['7980'], '38 × 14 × 15 cubes of 20 cm in 7.7 m × 2.8 m × 3 m'],
  ['num-time-intervals.core.F.nc.p0', ['60 minutes'], '11 20 am to 2 45 pm = 205 min; 205 − 50 − 95'],
  ['num-time-intervals.stretch.F.nc.p0', ['2225'], '7 h 25 min = 26 700 s; ÷ 12'],
  ['geom-parallel-angles.stretch.H.c.p0', ['Angle PQR = 75° ($x$ = 31)'], '172 − 3x + x − 5 + x + 44 = 180'],
  ['geom-regular-polygons.core.F.c.p0', ['5 sides', 'The exterior angle would be 51°, and 360 ÷ 51 is not a whole number.'], '180 − 108 = 72; 360 ÷ 72'],
  ['geom-polygon-algebra.core.F.c.p0', ['$x$ = 22'], '11x + 298 = 540'],
  ['geom-polygon-algebra.stretch.H.c.p0', ['169°'], '14x + 216 = 720, x = 36; 4 × 36 + 25'],
  // Batch 3
  ['ratio-proportion.foundational.H.c.p0', ['$y = \\frac{77}{x}$', '$y = 19.25$'], '11 × 7 = 77; 77 ÷ 4'],
  ['ratio-proportion.core.H.c.p0', ['$y = 5\\sqrt{x}$', '$x = 1$'], '30 = k × 6; √x = 5 ÷ 5'],
  ['ratio-proportion.stretch.H.c.p0', ['$P = \\frac{9}{64}$'], 'k = 36, c = 4, y = 16, P = 36 ÷ 256'],
  ['num-bounds.foundational.H.c.p0', ['6.105', '6.115', '73.38'], '6.11 ± 0.005; 12 × 6.115'],
  ['num-bounds.stretch.H.c.p0', ['$a$ = 5 (both bounds round to 5 to the nearest whole number)'], 'UB 22.46 ÷ 4.45 = 5.047, LB 22.44 ÷ 4.55 = 4.932'],
  ['geom-similarity.foundational.H.c.p0', ['$x$ = 12', '90 cm²'], 'scale factor 3; area × 9'],
  ['geom-similarity.core.H.c.p0', ['7203 cm³'], '√(1911/624) = 1.75; 1344 × 1.75³'],
  ['geom-similarity.stretch.H.c.p0', ['$k$ = 16.7'], '1 − 0.76^(2/3) = 0.1672'],
  ['geom-right-trig.core.H.c.p0', ['Yes: the angle is 70.2°, which is between 65° and 80°'], 'cos⁻¹(2.2 ÷ 6.5)'],
  ['geom-right-trig.stretch.H.c.p0', ['15.2°'], 'h = 29 tan 26° = 14.14; tan⁻¹(14.14 ÷ 52)'],
  ['geom-sine-cosine-rule.foundational.H.c.p0', ['51.4 cm²', '17.8 cm'], '52.5 sin 102°; √(274 − 210 cos 102°)'],
  ['geom-sine-cosine-rule.core.H.c.p0', ['94.3 cm²'], '2 × ½ × 10 × 11 × sin 121°'],
  ['geom-sine-cosine-rule.stretch.H.c.p0', ['38.2 cm'], 'sin B = 0.8, cos B = 0.6, AC = √148'],
  ['geom-pythagoras-3d.stretch.H.c.p0', ['31.6°'], 'tan⁻¹(5 ÷ √(64 + 2.25))'],
  ['stats-histogram.stretch.H.c.p0', ['332'], '128 − 40 = 88 → 2 per unit; 112 + 84 + 40 + 96'],
  ['alg-simultaneous-context.core.F.nc.p0', ['Coffee £4.15, cake £3.20'], '2(4.15) + 4(3.20) = 21.10; 4.15 + 6(3.20) = 23.35'],
  ['stats-grouped-mean.stretch.F.c.p0', ['52.6 minutes', 'Yes: 67 out of 106 is 63.2%, which is more than 50%'], '5580 ÷ 106; 67 ÷ 106'],
  // Batch 4
  ['num-lcm-problems.core.F.nc.p0', ['6 packs of paper bags and 5 packs of party hats'], 'LCM(15, 18) = 90'],
  ['num-lcm-problems.stretch.H.nc.p0', ['£36.25'], 'LCM(8, 15, 20) = 120: 15 × 0.85 + 8 × 1.85 + 6 × 1.45'],
  ['num-standard-form.core.H.c.p0', ['$1.64 \\times 10^{13}$'], '4.1 × 4 = 16.4, 10⁶ × 10⁶'],
  ['num-standard-form.stretch.H.nc.p0', ['$1 \\times 10^{6}$'], '2000 g ÷ 0.002 g'],
  ['num-percentage-of-percentage.stretch.H.c.p0', ['400'], '0.65 × 0.35 + 0.35 × 0.15 = 0.28; 112 ÷ 0.28'],
  ['alg-quadratic-area.core.H.nc.p0', ['36 cm'], '2x² + x − 55 = 0 → x = 5: 15 by 3'],
  ['alg-quadratic-area.stretch.H.c.p0', ['178 cm²'], 'x² − 12x − 84 = 0 → x = 6 + √120 = 16.95; ½ × 16.95 × 20.95'],
  ['alg-algebraic-proof.stretch.F.nc.p0', ['$(5n + 1)^2 - (n - 5)^2 = 24n^2 + 20n - 24 = 4(6n^2 + 5n - 6)$, which is a multiple of 4'], '25n² + 10n + 1 − (n² − 10n + 25)'],
  ['alg-straight-line.stretch.H.nc.p0', ['$(0, 7)$'], 'midpoint (3, 1), gradient ½ → −2; 1 = −6 + c'],
  ['geom-transformations.core.H.nc.p0', ['Rotation 90° anticlockwise about $(1, 3)$'], '(x, y) → (4 − y, x + 2) sends every corner of A to B'],
  ['geom-transformations.stretch.H.nc.p0', ['Rotation 180° about $(0, 0)$'], 'reflections in y = −x then y = x'],
  ['stats-cumulative-frequency.foundational.H.c.p0', ['32 (accept 31 to 34)', '9 (accept 7 to 10)'], 'median 30 + 5 × 14/30; LQ 28.2, UQ 37.1'],
  ['prob-tree-diagram.core.H.nc.p0', ['After black: black $\\frac{5}{14}$, white $\\frac{9}{14}$. After white: black $\\frac{6}{14}$, white $\\frac{8}{14}$', '$\\frac{17}{35}$'], '(30 + 72) ÷ 210'],
  ['prob-tree-diagram.stretch.H.nc.p0', ['$\\frac{6}{n} \\times \\frac{5}{n - 1} = \\frac{5}{12}$, so $n^2 - n - 72 = 0$', '$n = 9$'], 'n(n − 1) = 72'],
  ['prob-venn-diagram.stretch.H.nc.p0', ['$\\frac{14}{31}$'], '2x + x + 31 − x + 11 = 70 → x = 14'],
];

describe('golden questions (hand-verified)', () => {
  for (const [code, answers, working] of GOLDEN) {
    it(`${code}: ${working}`, () => {
      const q = questionFromCode(code);
      expect(q).not.toBeNull();
      expect(q!.answers.map((a) => a.text)).toEqual(answers);
    });
  }
});
