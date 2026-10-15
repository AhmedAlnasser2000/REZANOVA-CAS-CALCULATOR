/** The established rational proof-performance corpus; fixture construction only. */
export function rationalPerformanceFixtures(): readonly Readonly<{name: string; n: readonly number[]; d: readonly number[]}>[] {
const fixtures: { name: string; n: number[]; d: number[] }[] = [
  { name: 'quintic', n: [1], d: [-1,-1,0,0,0,1] },
  { name: 'quintic-log', n: [-1,0,0,0,5], d: [-1,-1,0,0,0,1] },
  { name: 'quadratic', n: [1], d: [1,0,1] },
  { name: 'quartic', n: [1], d: [1,0,0,0,1] },
  { name: 'repeated-poles', n: [1], d: [1,0,2,0,1] },
  { name: 'repeated-residues', n: [0,1], d: [-1,0,1] },
  { name: 'degree-loss', n: [2,-8,3], d: [0,2,-3,1] },
];
// Fixed seed; independent derivative of a/(x-p)+b log(x-p)+x³/3.
let seed = 271828;
const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
for (let i = 0; i < 3; i++) {
  const p = next() % 5 - 2, a = next() % 7 + 1, b = next() % 5 + 1;
  fixtures.push({ name: `seeded-${i}`, n: [-a-b*p,b,p*p,-2*p,1], d: [p*p,-2*p,1] });
}
return Object.freeze(fixtures.map(f => Object.freeze({name: f.name, n: Object.freeze(f.n), d: Object.freeze(f.d)})));
}
