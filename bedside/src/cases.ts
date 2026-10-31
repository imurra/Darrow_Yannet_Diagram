import { Event, fluid } from './engine';

export type Vol = 'dry' | 'euvolemic' | 'wet';
export type Need = 'in' | 'none' | 'out';
export type Grade = 'best' | 'ok' | 'harmful';
export type FluidId = 'ns' | 'lr' | 'd5w' | 'hts' | 'restrict' | 'loop';

const iso = (L: number): Event => ({ water: L, salt: 280 * L, glu: 5 * L });

export const FLUIDS: Record<FluidId, { name: string; detail: string; event: Event }> = {
  ns: { name: '0.9% saline, 1 L', detail: 'Na⁺ 154', event: fluid(1, 308) },
  lr: { name: "Lactated Ringer's, 1 L", detail: 'Na⁺ 130', event: fluid(1, 273) },
  d5w: { name: 'D5W, 1 L', detail: 'free water once glucose is used', event: fluid(1, 0) },
  hts: { name: '3% saline, 150 mL bolus', detail: 'Na⁺ 513', event: fluid(0.15, 1026) },
  restrict: { name: 'Fluid restriction', detail: '≈1 L less free water', event: fluid(-1, 0) },
  loop: { name: 'Loop diuretic', detail: '≈1.5 L urine, Na⁺ 70', event: fluid(-1.5, 140) },
};

export type Case = {
  id: string;
  title: string;
  story: string;
  danger: { brain: string; circulation: string };
  exam: string[];
  volume: Vol; volumeAlso?: Vol[]; volumeNote: string;
  events: Event[];
  icfNote: string;
  urine: { osm: number; na: number; extra?: string };
  water: 'holding' | 'dumping'; salt: 'holding' | 'losing';
  kidneyNote: string;
  causes: { text: string; correct?: boolean }[];
  causeNote: string;
  needEcf: Need; needCells: Need; needNote: string;
  // Kidney keeps excreting salt at this urine osmolality after treatment (ADH stays on)
  adhUosm?: number;
  grades: Partial<Record<FluidId, [Grade, string]>>;
};

export const CASES: Case[] = [
  {
    id: 'diarrhea', title: 'Three days of diarrhea',
    story: '34-year-old with 3 days of profuse watery diarrhea after travel. Light-headed when standing.',
    danger: { brain: 'Alert and oriented.', circulation: 'HR 118, BP 96/60, dizzy on standing.' },
    exam: ['Orthostatic: BP falls 22/12, HR rises 30', 'Flat neck veins', 'Dry mucous membranes', 'No edema'],
    volume: 'dry', volumeNote: 'Orthostatic, flat JVP, dry mucosa: the ECF is down.',
    events: [iso(-2.5)],
    icfNote: 'Na⁺ is normal, so tonicity is normal. No water moves; the cells are unchanged.',
    urine: { osm: 650, na: 10 },
    water: 'holding', salt: 'holding',
    kidneyNote: 'Concentrated urine with low Na⁺: the kidney is holding salt and water. That is the right response to a dry ECF.',
    causes: [{ text: 'Isotonic GI fluid loss', correct: true }, { text: 'Diuretic use' }, { text: 'Adrenal insufficiency' }, { text: 'SIADH' }],
    causeNote: 'An appropriate kidney response points away from the kidney: the loss is from the gut.',
    needEcf: 'in', needCells: 'none', needNote: 'Fill the ECF; the cells are fine, so give fluid that does not change tonicity.',
    grades: {
      ns: ['best', 'Isotonic: stays in the ECF and refills it without moving water into or out of cells.'],
      lr: ['best', 'Near-isotonic: refills the ECF; a common first choice for GI losses.'],
      d5w: ['harmful', 'Two-thirds goes into cells and Na⁺ falls. It barely refills the circulation.'],
      hts: ['harmful', 'Pulls water out of normal cells and raises Na⁺ for no reason.'],
      restrict: ['harmful', 'The patient is already dry.'],
      loop: ['harmful', 'Removes more ECF from a dry patient.'],
    },
  },
  {
    id: 'marathon', title: 'Confused at the finish line',
    story: '28-year-old marathon runner, 4-hour race, drank water at every station. Now confused and vomiting.',
    danger: { brain: 'Confused, vomiting, headache: symptoms of brain swelling.', circulation: 'HR 92, BP 118/74, not orthostatic.' },
    exam: ['Not orthostatic', 'Normal neck veins', 'Moist mucous membranes', 'No edema; weight up about 1 kg'],
    volume: 'euvolemic', volumeAlso: ['dry'], volumeNote: 'Close to normal. Sweat salt loss shrank the ECF slightly, but not enough to detect at the bedside.',
    events: [fluid(-3, 100), fluid(4.8, 0)],
    icfNote: 'Tonicity is down, so water moved into the cells. Brain cells swelled: that is the confusion.',
    urine: { osm: 450, na: 40 },
    water: 'holding', salt: 'losing',
    kidneyNote: 'Concentrated urine despite low Na⁺: ADH is still on, driven by nausea, exercise and stress. Inappropriate for the tonicity.',
    causes: [{ text: 'Overdrinking with ADH still on', correct: true }, { text: 'Sweat salt loss alone' }, { text: 'Heart failure' }, { text: 'Diabetes insipidus' }],
    causeNote: 'Sweat lost some salt, but the large free-water gain with ADH on is what dropped Na⁺.',
    needEcf: 'none', needCells: 'out', needNote: 'Volume is about right. Brain cells are swollen, so water has to come out of them.',
    adhUosm: 450,
    grades: {
      hts: ['best', 'Symptomatic: a small hypertonic bolus raises tonicity and pulls water out of brain cells fast, with little volume.'],
      restrict: ['ok', 'Right direction, but too slow for a confused, vomiting patient.'],
      ns: ['harmful', 'With ADH on, the kidney excretes the salt in concentrated urine and keeps the water. Na⁺ falls further.'],
      lr: ['harmful', 'Hypotonic to this urine: adds free water and lowers Na⁺.'],
      d5w: ['harmful', 'Pure free water into swollen brain cells.'],
      loop: ['ok', 'Can help shed free water, but does not act fast enough on its own.'],
    },
  },
  {
    id: 'siadh', title: 'A smoker with a low sodium',
    story: '66-year-old with a 50-pack-year history and a new lung mass. Mild nausea, otherwise well.',
    danger: { brain: 'Mild nausea, no confusion or seizures.', circulation: 'HR 78, BP 132/80, not orthostatic.' },
    exam: ['Not orthostatic', 'Normal neck veins', 'Moist mucous membranes', 'No edema'],
    volume: 'euvolemic', volumeNote: 'Looks normal. Retained water spreads across both compartments, so only a third stays in the ECF.',
    events: [fluid(3.5, 0)],
    icfNote: 'Tonicity is down, so water moved into the cells. They are swollen.',
    urine: { osm: 600, na: 50 },
    water: 'holding', salt: 'losing',
    kidneyNote: 'Concentrated urine with low Na⁺ and a normal volume: ADH is on with no reason to be. Inappropriate.',
    causes: [{ text: 'SIADH (tumor-secreted ADH)', correct: true }, { text: 'Hypovolemia' }, { text: 'Adrenal insufficiency' }, { text: 'Psychogenic polydipsia' }],
    causeNote: 'Euvolemic, concentrated urine, urine Na⁺ over 20, and a lung mass: SIADH. Polydipsia would make dilute urine.',
    needEcf: 'none', needCells: 'out', needNote: 'Volume is fine. The cells hold excess water.',
    adhUosm: 600,
    grades: {
      restrict: ['best', 'Removes the free water that ADH is holding. Slow and safe for mild symptoms.'],
      hts: ['ok', 'Reserved for severe symptoms. Mild nausea does not need it.'],
      ns: ['harmful', 'The saline trap: urine (600) is more concentrated than saline (308). The kidney excretes the salt and keeps the water, so Na⁺ falls.'],
      lr: ['harmful', 'Same trap, slightly worse.'],
      d5w: ['harmful', 'More free water for a kidney that cannot excrete it.'],
      loop: ['ok', 'Sometimes combined with salt tablets to lower urine osmolality. Not first-line alone.'],
    },
  },
  {
    id: 'hf', title: 'Short of breath with swollen legs',
    story: '72-year-old with known heart failure. Two weeks of worsening breathlessness and leg swelling.',
    danger: { brain: 'Alert, mildly fatigued.', circulation: 'BP 104/70, cool hands, short of breath lying flat.' },
    exam: ['Raised JVP', 'Crackles at both lung bases', 'Pitting edema to the knees', 'Weight up 4 kg'],
    volume: 'wet', volumeNote: 'Edema, raised JVP, crackles, weight gain: the ECF is expanded, mostly in the interstitium.',
    events: [fluid(5, 150)],
    icfNote: 'Tonicity is down, so water moved into the cells, which are mildly swollen.',
    urine: { osm: 450, na: 8 },
    water: 'holding', salt: 'holding',
    kidneyNote: 'Holding both salt and water. The kidney senses low perfusion from a weak heart, so from its view this is appropriate, even though the patient is overloaded.',
    causes: [{ text: 'Low effective arterial volume (heart failure)', correct: true }, { text: 'SIADH' }, { text: 'Isotonic saline overload' }, { text: 'Adrenal insufficiency' }],
    causeNote: 'Wet, with urine Na⁺ under 20: the kidney thinks the circulation is underfilled. That is effective arterial volume, not total ECF.',
    needEcf: 'out', needCells: 'out', needNote: 'Remove ECF (salt and water), and more water than salt to bring tonicity up.',
    grades: {
      loop: ['best', 'Removes salt and water; the urine is hypotonic, so Na⁺ also improves. Add fluid restriction.'],
      restrict: ['ok', 'Helps Na⁺, but does not remove the excess salt driving the edema.'],
      ns: ['harmful', 'Adds salt and water to an overloaded patient. The kidney keeps it all.'],
      lr: ['harmful', 'More volume for an overloaded patient.'],
      d5w: ['harmful', 'Free water lowers Na⁺ further.'],
      hts: ['harmful', 'Adds salt load; only considered with diuretics in specialist care.'],
    },
  },
  {
    id: 'addison', title: 'Weak, dizzy and darker skin',
    story: '41-year-old with months of fatigue, weight loss and salt craving. Skin creases look darker.',
    danger: { brain: 'Tired but oriented.', circulation: 'HR 112, BP 88/54, faint on standing.' },
    exam: ['Orthostatic hypotension', 'Flat neck veins', 'Dry mucous membranes', 'Hyperpigmented palmar creases'],
    volume: 'dry', volumeNote: 'Orthostatic, flat JVP, dry mucosa: the ECF is down.',
    events: [fluid(-2, 650)],
    icfNote: 'Salt was lost faster than water, so tonicity fell and water moved into the cells. They are swollen even though the patient is dry.',
    urine: { osm: 400, na: 60 },
    water: 'holding', salt: 'losing',
    kidneyNote: 'Dry, yet urine Na⁺ is high: the kidney is wasting salt. Without aldosterone it cannot hold it. Inappropriate.',
    causes: [{ text: 'Adrenal insufficiency (no aldosterone)', correct: true }, { text: 'Diarrhea' }, { text: 'SIADH' }, { text: 'Heart failure' }],
    causeNote: 'A dry patient losing salt in the urine means the kidney is the problem. Diuretics also do this; the history and skin point to Addison’s.',
    needEcf: 'in', needCells: 'out', needNote: 'Fill the ECF with salt. Restoring tonicity will draw water back out of the cells.',
    grades: {
      ns: ['best', 'Restores salt and volume. Give hydrocortisone too; that fixes the cause.'],
      lr: ['ok', 'Refills volume, but less sodium than saline.'],
      d5w: ['harmful', 'Free water lowers Na⁺ further and barely fills the circulation.'],
      hts: ['ok', 'Only for severe neurologic symptoms; volume is the main need here.'],
      restrict: ['harmful', 'The patient is dry.'],
      loop: ['harmful', 'Removes more salt and volume.'],
    },
  },
  {
    id: 'dehydration', title: 'Found at home after a hot weekend',
    story: '84-year-old with dementia, found at home after a heat wave. Has not been drinking.',
    danger: { brain: 'Drowsy and confused.', circulation: 'HR 104, BP 108/66, mildly orthostatic.' },
    exam: ['Mildly orthostatic', 'Flat neck veins', 'Very dry mucous membranes', 'No edema'],
    volume: 'dry', volumeNote: 'Mildly dry. Most of the water lost came from the cells, so the ECF fell less than you might expect.',
    events: [fluid(-4, 0)],
    icfNote: 'Tonicity is up, so water moved out of the cells. Brain cells have shrunk: that is the drowsiness.',
    urine: { osm: 900, na: 15 },
    water: 'holding', salt: 'holding',
    kidneyNote: 'Maximally concentrated urine: ADH is working hard. Appropriate.',
    causes: [{ text: 'Not drinking (no access to water)', correct: true }, { text: 'Diabetes insipidus' }, { text: 'Salt ingestion' }, { text: 'Osmotic diuresis' }],
    causeNote: 'The kidney is doing everything right; the problem is intake. DI would make dilute urine.',
    needEcf: 'in', needCells: 'in', needNote: 'Mostly cells need water back; the ECF needs a little.',
    grades: {
      d5w: ['best', 'Free water goes where it is needed: mostly into the cells. Correct slowly.'],
      ns: ['ok', 'Use first only if hypotensive. It is hypotonic to this patient, but barely restores cell water.'],
      lr: ['ok', 'Similar to saline: fills volume, slow to fix tonicity.'],
      hts: ['harmful', 'Shrinks cells that are already shrunken.'],
      restrict: ['harmful', 'The patient needs water.'],
      loop: ['harmful', 'Removes more water.'],
    },
  },
  {
    id: 'di', title: 'Thirsty on lithium',
    story: '45-year-old on lithium for 10 years. Passing large volumes of urine, constantly thirsty. Admitted after a fall; no water overnight.',
    danger: { brain: 'Irritable and confused.', circulation: 'HR 98, BP 118/72, not orthostatic.' },
    exam: ['Mildly orthostatic', 'Normal neck veins', 'Dry mucous membranes', 'No edema'],
    volume: 'dry', volumeAlso: ['euvolemic'], volumeNote: 'Mildly dry. Pure water loss comes two-thirds from cells, so the ECF changes little.',
    events: [fluid(-3.5, 0)],
    icfNote: 'Tonicity is up, so water moved out of the cells. They have shrunk.',
    urine: { osm: 90, na: 15 },
    water: 'dumping', salt: 'holding',
    kidneyNote: 'Dilute urine while Na⁺ is high: the kidney cannot hold water. Inappropriate.',
    causes: [{ text: 'Nephrogenic diabetes insipidus (lithium)', correct: true }, { text: 'Not drinking alone' }, { text: 'Osmotic diuresis' }, { text: 'SIADH' }],
    causeNote: 'High Na⁺ with dilute urine means the kidney is losing water. Lithium blocks ADH’s effect.',
    needEcf: 'none', needCells: 'in', needNote: 'The cells need water back; volume is close to normal.',
    grades: {
      d5w: ['best', 'Free water refills the cells. Also stop or review the lithium.'],
      ns: ['ok', 'Not harmful, but slow to fix tonicity, and the salt load increases urine output.'],
      lr: ['ok', 'Similar to saline.'],
      hts: ['harmful', 'Shrinks cells further.'],
      restrict: ['harmful', 'This kidney cannot conserve water; restriction is dangerous.'],
      loop: ['harmful', 'More water loss.'],
    },
  },
  {
    id: 'hhs', title: 'Very high sugar, low sodium',
    story: '70-year-old with type 2 diabetes, a week of thirst and passing large volumes of urine. Now drowsy.',
    danger: { brain: 'Drowsy, slow to answer.', circulation: 'HR 116, BP 94/58, orthostatic.' },
    exam: ['Orthostatic', 'Flat neck veins', 'Very dry mucous membranes', 'No edema'],
    volume: 'dry', volumeNote: 'Dry: glucose-driven urine losses drained the ECF.',
    events: [{ water: 0, glu: 1200 }, { water: -4, salt: -60 * 4, glu: -100 * 4 }],
    icfNote: 'The trap: Na⁺ is low, yet tonicity is high because of glucose. Water moved OUT of the cells. They have shrunk.',
    urine: { osm: 550, na: 50, extra: 'Urine glucose 4+' },
    water: 'dumping', salt: 'losing',
    kidneyNote: 'The urine osmolality is high from glucose, not from ADH. Glucose drags water and salt out: an osmotic diuresis.',
    causes: [{ text: 'Osmotic diuresis from hyperglycemia', correct: true }, { text: 'SIADH' }, { text: 'Diabetes insipidus' }, { text: 'Diarrhea' }],
    causeNote: 'Glucose in the urine carries water and salt with it, so the kidney cannot hold either.',
    needEcf: 'in', needCells: 'in', needNote: 'Fill the ECF first. The cells need water too, but fixing glucose with insulin will move water back into them.',
    grades: {
      ns: ['best', 'Volume first. Then insulin; as glucose falls, water returns to cells and Na⁺ rises.'],
      lr: ['ok', 'Also refills volume.'],
      d5w: ['harmful', 'Adds glucose to a patient whose problem is glucose.'],
      hts: ['harmful', 'Tonicity is already high.'],
      restrict: ['harmful', 'The patient is dry.'],
      loop: ['harmful', 'Removes more volume.'],
    },
  },
];
