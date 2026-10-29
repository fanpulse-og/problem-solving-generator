/**
 * Reskinnable contexts, kept apart from the maths so a template can be
 * reused with many stories. All are everyday UK settings suitable for school.
 */

export const TICKET_EVENTS = [
  'a school concert',
  'a charity quiz night',
  'the school play',
  'a pantomime',
  'a summer fair',
  'a talent show',
  'a football match',
  'a fireworks display',
];

/** Things that can be given away in whole numbers. */
export const COUNTABLE_GIFTS = [
  { plural: 'beads', single: 'bead' },
  { plural: 'stickers', single: 'sticker' },
  { plural: 'football cards', single: 'football card' },
  { plural: 'marbles', single: 'marble' },
  { plural: 'badges', single: 'badge' },
  { plural: 'seed packets', single: 'seed packet' },
];

export const SQUASH_FLAVOURS = ['orange', 'blackcurrant', 'apple', 'lemon', 'mango'];

/** Linear rules: output = rate × input + fixed. */
export const LINEAR_RULES = [
  {
    id: 'chicken',
    intro: (n: string) => `${n} has bought a chicken.`,
    ruleLines: ['Cooking time:', '{rate} minutes for each kilogram', 'plus an extra {fixed} minutes'],
    inputName: 'weight',
    inputUnit: 'kg',
    outputName: 'cooking time',
    outputIsTime: true,
  },
  {
    id: 'turkey',
    intro: (n: string) => `${n} is cooking a turkey.`,
    ruleLines: ['Cooking time:', '{rate} minutes for each kilogram', 'plus an extra {fixed} minutes'],
    inputName: 'weight',
    inputUnit: 'kg',
    outputName: 'cooking time',
    outputIsTime: true,
  },
] as const;

export const HIRE_RULES = [
  { item: 'a cement mixer', unit: 'day', units: 'days' },
  { item: 'a carpet cleaner', unit: 'day', units: 'days' },
  { item: 'a bouncy castle', unit: 'hour', units: 'hours' },
  { item: 'a rowing boat', unit: 'hour', units: 'hours' },
];

export const SHARE_CONTEXTS = [
  { kind: 'money', verb: 'share some money', unitIsMoney: true },
  { kind: 'stickers', verb: 'share some stickers', unitIsMoney: false, noun: 'stickers' },
  { kind: 'sweets', verb: 'share a bag of sweets', unitIsMoney: false, noun: 'sweets' },
  { kind: 'cards', verb: 'share a pack of trading cards', unitIsMoney: false, noun: 'cards' },
];

/** Three-way shares measured in a unit. */
export const THREE_WAY_CONTEXTS = [
  { what: 'chocolate', unit: 'grams', unitShort: 'g', symbol: 'C' },
  { what: 'sand', unit: 'kilograms', unitShort: 'kg', symbol: 'S' },
  { what: 'compost', unit: 'litres', unitShort: 'litres', symbol: 'L' },
];

/** Three categories of one collection for linked-ratio questions. */
export const LINKED_RATIO_CONTEXTS = [
  { container: 'In a box, there are only', items: ['green sweets', 'orange sweets', 'yellow sweets'], noun: 'sweets', where: 'in the box', max: 300 },
  { container: 'In a bag, there are only', items: ['red counters', 'blue counters', 'white counters'], noun: 'counters', where: 'in the bag', max: 200 },
  { container: 'In a bouquet, there are only', items: ['roses', 'tulips', 'lilies'], noun: 'flowers', where: 'in the bouquet', max: 60 },
  { container: 'In a car park, there are only', items: ['silver cars', 'black cars', 'red cars'], noun: 'cars', where: 'in the car park', max: 400 },
];

export const FLOOR_CONTEXTS = [
  { place: 'a stage', who: 'stage manager', job: 'paint the floor', product: 'paint', container: 'tin', containers: 'tins', covers: 'covers' },
  { place: 'a school hall', who: 'caretaker', job: 'varnish the floor', product: 'varnish', container: 'tin', containers: 'tins', covers: 'covers' },
  { place: 'a patio', who: 'gardener', job: 'seal the patio', product: 'sealant', container: 'tub', containers: 'tubs', covers: 'covers' },
  { place: 'a sports hall', who: 'site manager', job: 'paint the floor', product: 'floor paint', container: 'tin', containers: 'tins', covers: 'covers' },
  { place: 'a café', who: 'owner', job: 'varnish the floor', product: 'varnish', container: 'tin', containers: 'tins', covers: 'covers' },
];

export const SPINNER_CONTEXTS = [
  {
    intro: 'Here is a biased spinner.',
    once: 'When the spinner is spun once, the probabilities that it lands on',
    header: 'Colour',
    outcomes: ['red', 'yellow', 'purple', 'green'],
    event: (o: string) => `the spinner lands on ${o}`,
    trials: (name: string, n: string) => `${name} is going to spin the spinner ${n} times.`,
  },
  {
    intro: 'A bag contains only red, blue, green and white counters.',
    once: 'A counter is taken at random from the bag. The probabilities that the counter is',
    header: 'Colour',
    outcomes: ['red', 'blue', 'green', 'white'],
    event: (o: string) => `the counter is ${o}`,
    trials: (name: string, n: string) => `${name} takes a counter at random from the bag, records its colour and puts it back. ${name} does this ${n} times.`,
  },
  {
    intro: 'Here is a biased four-sided dice.',
    once: 'When the dice is thrown once, the probabilities that it lands on',
    header: 'Number',
    outcomes: ['1', '2', '3', '4'],
    event: (o: string) => `the dice lands on ${o}`,
    trials: (name: string, n: string) => `${name} is going to throw the dice ${n} times.`,
  },
];

export const SURVEY_CONTEXTS = [
  { who: 'Some members of a library were asked to name the type of book that they each liked to read the best.', group: 'members', header: 'Type of book', options: ['comedy', 'romance', 'mystery', 'thriller'], verb: 'answered' },
  { who: 'Some students were asked to name their favourite type of film.', group: 'students', header: 'Type of film', options: ['action', 'comedy', 'animation', 'horror'], verb: 'answered' },
  { who: 'Some people at a leisure centre were asked to name the sport they each liked the best.', group: 'people', header: 'Sport', options: ['swimming', 'tennis', 'football', 'badminton'], verb: 'answered' },
  { who: 'Some customers at a café were asked to name their favourite drink.', group: 'customers', header: 'Drink', options: ['tea', 'coffee', 'hot chocolate', 'juice'], verb: 'answered' },
];

export const TWO_WAY_CONTEXTS = [
  {
    intro: (n: string) => `The two-way table shows some information about the desserts chosen at lunch yesterday by ${n} students from Year 7 and Year 8.`,
    each: 'Each student chose one dessert from apple pie or fruit or ice cream.',
    rows: ['Year 7', 'Year 8'],
    cols: ['apple pie', 'fruit', 'ice cream'],
    noun: 'students',
    inRow: (r: string) => `are in ${r}`,
    rowNoun: (r: string) => `${r} students`,
    did: (c: string) => `chose ${c}`,
  },
  {
    intro: (n: string) => `The two-way table shows some information about the favourite type of bike of the ${n} members of a cycling club.`,
    each: 'Each member is either an adult or a junior, and named one type of bike.',
    rows: ['Adult', 'Junior'],
    cols: ['road bike', 'mountain bike', 'hybrid bike'],
    noun: 'members',
    inRow: (r: string) => `are ${r === 'Adult' ? 'adults' : 'juniors'}`,
    rowNoun: (r: string) => (r === 'Adult' ? 'adult members' : 'junior members'),
    did: (c: string) => `named ${c}`,
  },
  {
    intro: (n: string) => `The two-way table shows some information about how ${n} students in Year 9 and Year 10 travel to school.`,
    each: 'Each student either walks or goes by bus or goes by car.',
    rows: ['Year 9', 'Year 10'],
    cols: ['walk', 'bus', 'car'],
    noun: 'students',
    inRow: (r: string) => `are in ${r}`,
    rowNoun: (r: string) => `${r} students`,
    did: (c: string) => (c === 'walk' ? 'walk' : `go by ${c}`),
  },
  {
    intro: (n: string) => `The two-way table shows some information about the exhibition visited by each of ${n} visitors to a museum.`,
    each: 'Each visitor visited one exhibition from dinosaurs or space or Romans.',
    rows: ['Adult', 'Child'],
    cols: ['dinosaurs', 'space', 'Romans'],
    noun: 'visitors',
    inRow: (r: string) => `are ${r === 'Adult' ? 'adults' : 'children'}`,
    rowNoun: (r: string) => (r === 'Adult' ? 'adults' : 'children'),
    did: (c: string) => `visited ${c}`,
  },
];

export const MEASURE_CONTEXTS = [
  { people: 'friends', measure: 'height', plural: 'heights', unit: 'cm', lo: 140, hi: 185 },
  { people: 'runners', measure: 'race time', plural: 'race times', unit: 'seconds', lo: 12, hi: 40 },
  { people: 'students', measure: 'quiz score', plural: 'quiz scores', unit: 'points', lo: 10, hi: 60 },
  { people: 'cousins', measure: 'age', plural: 'ages', unit: 'years', lo: 5, hi: 40 },
];

export const GROUP_MEAN_CONTEXTS = [
  { groups: ['Class A', 'Class B'], who: 'students', what: 'mark in a Mathematics exam', unit: 'marks', lo: 30, hi: 80, total: 'mark', intro: 'sat a Mathematics exam.' },
  { groups: ['the Tigers', 'the Lions'], who: 'members', what: 'number of runs scored in a season', unit: 'runs', lo: 20, hi: 90, total: 'number of runs', intro: 'are in a cricket club, split into two teams.' },
  { groups: ['Box A', 'Box B'], who: 'apples', what: 'weight', unit: 'grams', lo: 120, hi: 220, total: 'weight', intro: 'are packed into two boxes.' },
  { groups: ['the morning group', 'the afternoon group'], who: 'people', what: 'time spent in the gym', unit: 'minutes', lo: 30, hi: 90, total: 'time', intro: 'went to a gym on Saturday.' },
];
