// Darrow–Yannet physiology engine (no UI).
// Effective osmoles (salt, glucose) stay in the ECF; ICF effective solute is fixed;
// urea crosses membranes freely, so it raises measured osmolarity without moving water.

export type State = {
  ecf: number; icf: number;          // liters
  salt: number; glu: number;         // ECF solute, mOsm (salt counted as Na + anion)
  icfEff: number;                    // ICF effective solute, mOsm
  urea: number;                      // total body urea, mOsm (spread over all water)
};

// An event adds (positive) or removes (negative) water and solute amounts.
export type Event = { water: number; salt?: number; glu?: number; urea?: number; label?: string };

export const BASE: State = { ecf: 14, icf: 28, salt: 280 * 14, glu: 5 * 14, icfEff: 285 * 28, urea: 5 * 42 };
const RBC0 = 2.864;   // L, gives Hct 45% with plasma = 25% of ECF

// Fluid helpers (concentrations in mOsm/L; liters negative = loss)
export const fluid = (liters: number, saltConc = 0, gluConc = 0, label?: string): Event =>
  ({ water: liters, salt: saltConc * liters, glu: gluConc * liters, label });

export type Stage = {
  ecf: number; icf: number;
  ecfOsm: number; icfOsm: number;    // measured osmolarity of each compartment
};

export type Snapshot = { before: Stage; after: Stage; state: State };

export function apply(s: State, e: Event): Snapshot {
  const ecfB = Math.max(0.5, s.ecf + e.water);
  const salt = Math.max(0, s.salt + (e.salt ?? 0));
  const glu = Math.max(0, s.glu + (e.glu ?? 0));
  const urea = Math.max(0, s.urea + (e.urea ?? 0));
  const tbw = ecfB + s.icf;
  const ureaC = urea / tbw;
  const before: Stage = {
    ecf: ecfB, icf: s.icf,
    ecfOsm: (salt + glu) / ecfB + ureaC,
    icfOsm: s.icfEff / s.icf + ureaC,
  };
  const eff = (salt + glu + s.icfEff) / tbw;
  const icf = s.icfEff / eff;
  const ecf = tbw - icf;
  const after: Stage = { ecf, icf, ecfOsm: eff + ureaC, icfOsm: eff + ureaC };
  return { before, after, state: { ecf, icf, salt, glu, icfEff: s.icfEff, urea } };
}

export function run(events: Event[], start: State = BASE) {
  let s = start;
  const steps: Snapshot[] = [];
  for (const e of events) { const snap = apply(s, e); steps.push(snap); s = snap.state; }
  return { steps, final: s };
}

export function labs(s: State) {
  const tbw = s.ecf + s.icf;
  const ureaC = s.urea / tbw;
  const eff = (s.salt + s.glu) / s.ecf;
  const rbc = RBC0 * (s.icf / BASE.icf);
  const plasma = 0.25 * s.ecf;
  return {
    na: s.salt / s.ecf / 2,
    glucose: (s.glu / s.ecf) * 18,      // mg/dL
    bun: ureaC * 2.8,                   // mg/dL
    osm: eff + ureaC,                   // measured
    effOsm: eff,
    hct: (100 * rbc) / (rbc + plasma),
  };
}

export type Dir = -1 | 0 | 1;
export const dir = (d: number, eps: number): Dir => (d > eps ? 1 : d < -eps ? -1 : 0);

export const VARS = ['ecf', 'icf', 'osm', 'na'] as const;
export type Var = typeof VARS[number];
export type Answer = Record<Var, Dir>;

export function directions(s: State): Answer {
  const l = labs(s), b = labs(BASE);
  return {
    ecf: dir(s.ecf - BASE.ecf, 0.1),
    icf: dir(s.icf - BASE.icf, 0.1),
    osm: dir(l.osm - b.osm, 2),
    na: dir(l.na - b.na, 1),
  };
}

// Treatment. If ADH is fixed on, the kidney excretes any salt given at the urine osmolality,
// keeping the rest of the water (the "desalination" of fluids less concentrated than urine).
export function treat(s: State, e: Event, adhUosm?: number): State {
  let st = apply(s, e).state;
  const given = e.salt ?? 0;
  if (adhUosm && given > 0 && e.water > 0 && given / e.water < adhUosm) {
    st = apply(st, { water: -(given / adhUosm), salt: -given }).state;
  }
  return st;
}
