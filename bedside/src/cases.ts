import { Event, fluid } from './engine';

export type Vol = 'dry' | 'euvolemic' | 'wet';
export type Danger = 'brain' | 'circulation' | 'both' | 'neither';
export type Need = 'in' | 'none' | 'out';
export type Grade = 'best' | 'ok' | 'harmful';
export type FluidId = 'ns' | 'lr' | 'd5w' | 'hts' | 'restrict' | 'loop';

const iso = (L: number): Event => ({ water: L, salt: 280 * L, glu: 5 * L });

export const FLUIDS: Record<FluidId, { name: string; detail: string; event: Event }> = {
  ns: { name: '0.9% saline, 1 L', detail: 'Na⁺ 154', event: fluid(1, 308) },
  lr: { name: "Lactated Ringer's, 1 L", detail: 'Na⁺ 130', event: fluid(1, 273) },
  d5w: { name: 'D5W, 1 L', detail: 'free water once glucose is used', event: fluid(1, 0) },
  hts: { name: '3% saline, 150 mL bolus', detail: 'Na⁺ 513 · emergency bolus only; too fast a rise risks osmotic demyelination', event: fluid(0.15, 1026) },
  restrict: { name: 'Fluid restriction', detail: '≈1 L less free water', event: fluid(-1, 0) },
  loop: { name: 'Loop diuretic', detail: '≈1.5 L urine, Na⁺ 70', event: fluid(-1.5, 140) },
};

export type Case = {
  id: string;
  title: string;
  // Extra practice: shown after the core cases, not required
  optional?: boolean;
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
  // The causal chain, in order, for the end-of-case ordering task
  chain: string[];
  // Danger step: which system is threatened
  dangerKey: Danger; dangerAlso?: Danger[]; dangerNote: string;
  // Kidney step: is the kidney's response homeostatic, or part of the problem?
  kidneyRole: 'homeostatic' | 'problem'; roleNote: string;
  // End-of-case debrief (illness script)
  debrief: { who: string; what: string; findings: string; danger: string };
  needEcf: Need; needCells: Need; needNote: string;
  // Kidney keeps excreting salt at this urine osmolality after treatment (ADH stays on)
  adhUosm?: number;
  // Safety and monitoring advice shown with every treatment choice
  safety: string;
  // Emergency: no treatment choice; the case ends with specialist referral
  specialist?: boolean;
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
    causes: [{ text: 'Diuretic use' }, { text: 'Adrenal insufficiency' }, { text: 'Isotonic GI fluid loss', correct: true }, { text: 'SIADH' }],
    causeNote: 'An appropriate kidney response points away from the kidney: the loss is from the gut.',
    chain: ['Isotonic fluid is lost from the gut', 'ECF volume falls; its osmolality is unchanged', 'No gradient, so no water crosses the cell membrane', 'The whole deficit is in the ECF: light-headed on standing'],
    dangerKey: 'circulation', dangerNote: "Fast pulse, low BP and orthostatic changes: the circulation is in danger. Alert and oriented, so the brain is fine.",
    kidneyRole: 'homeostatic', roleNote: "Holding salt and water is exactly what a dry ECF needs. The kidney is responding, not causing.",
    debrief: { who: "Young adult with diarrhea after travel.", what: "Stool is roughly isotonic, so salt and water left the ECF together. Tonicity did not change, so no water crossed into or out of cells.", findings: "Orthostatic, flat neck veins, dry mucosa; normal Na⁺, high Hct; concentrated urine with low Na⁺.", danger: "Circulation: a shrinking ECF can progress to shock." },
    needEcf: 'in', needCells: 'none', needNote: 'Fill the ECF; the cells are fine, so give fluid that does not change tonicity.',
    safety: 'Na⁺ is normal, so there is no sodium speed limit here. Reassess volume after each bolus and check K⁺ and HCO₃⁻, which diarrhea also depletes.',
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
    causes: [{ text: 'Hypovolemia' }, { text: 'Adrenal insufficiency' }, { text: 'Psychogenic polydipsia' }, { text: 'SIADH (tumor-secreted ADH)', correct: true }],
    causeNote: 'Euvolemic, concentrated urine, urine Na⁺ over 20, and a lung mass: SIADH. Polydipsia would make dilute urine.',
    chain: ['The lung tumor secretes ADH', 'The kidney keeps free water', 'ECF osmolality falls below the cells', 'Water moves into the cells', 'Na⁺ is low but the patient looks euvolemic'],
    dangerKey: 'neither', dangerNote: "Stable vitals and only mild nausea: no immediate danger to the brain or the circulation. The low Na⁺ still matters.",
    kidneyRole: 'problem', roleNote: "Concentrated urine despite a low Na⁺ and a normal volume: ADH is on with no reason to be. The kidney is following inappropriate ADH.",
    debrief: { who: "Older smoker with a new lung mass.", what: "The tumor secretes ADH, so the kidney keeps free water. About two-thirds of that water moves into cells, so the patient looks euvolemic while Na⁺ falls.", findings: "Euvolemic; Na⁺ 129; urine osm 600 and urine Na⁺ 50.", danger: "Mild now. If Na⁺ falls further or faster, brain swelling follows." },
    needEcf: 'none', needCells: 'out', needNote: 'Volume is fine. The cells hold excess water.',
    adhUosm: 600,
    safety: 'Chronic hyponatremia: raise Na⁺ no more than 8–10 mmol/L in 24 h, and no more than 8 if osmotic demyelination risk is high (Na⁺ ≤105, low K⁺, alcohol use, malnutrition, liver disease). Too fast a rise can cause osmotic demyelination days later. Check Na⁺ every 4–6 h; D5W or desmopressin can bring an overshoot back down.',
    grades: {
      restrict: ['best', 'Removes the free water that ADH is holding. Slow and safe for mild symptoms.'],
      hts: ['ok', 'Reserved for severe symptoms. Mild nausea does not need it, and in chronic hyponatremia a fast rise risks osmotic demyelination.'],
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
    chain: ['The weak heart underfills the arteries', 'The kidney senses low perfusion and holds salt and water', 'ECF expands and its osmolality falls', 'Water moves into the cells', 'Edema and breathlessness, with a low Na⁺'],
    dangerKey: 'circulation', dangerNote: "Breathless lying flat, cool hands and a low-normal BP: the circulation is failing (overloaded lungs, poor forward flow). Alert, so the brain is fine.",
    kidneyRole: 'homeostatic', roleNote: "Holding salt and water is the kidney’s normal response to low perfusion. It is responding correctly to what it senses (underfilled arteries), even though the ECF is already too big.",
    debrief: { who: "Older adult with known heart failure.", what: "The weak heart underfills the arteries. The kidney senses low perfusion and holds salt and, through ADH, extra water. The ECF expands (edema), tonicity falls slightly and some water moves into cells.", findings: "Raised JVP, crackles, edema, weight up; Na⁺ 133; urine Na⁺ 8.", danger: "Circulation: fluid in the lungs and poor forward flow." },
    needEcf: 'out', needCells: 'out', needNote: 'Remove ECF (salt and water), and more water than salt to bring tonicity up.',
    safety: 'Check K⁺, Mg²⁺ and creatinine during diuresis. Fluid restriction helps the Na⁺. Keep the Na⁺ rise within 8–10 mmol/L in 24 h; diuresis rarely overshoots, but vaptans can.',
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
    chain: ['Glucose builds up in the ECF', 'ECF osmolality rises above the cells', 'Water moves out of the cells, diluting Na⁺', 'Brain cells shrink: drowsiness'],
    dangerKey: 'both', dangerNote: "Drowsy (brain) with a low BP and orthostasis (circulation): both are in danger.",
    kidneyRole: 'problem', roleNote: "Glucose in the urine drags water and salt out with it (osmotic diuresis). The kidney cannot hold either, so its losses are part of the problem.",
    debrief: { who: "Older adult with type 2 diabetes.", what: "Glucose builds up in the ECF and raises tonicity, pulling water out of cells and diluting Na⁺. Glucose spilling into the urine carries water and salt out, shrinking the ECF further.", findings: "Glucose 1135; Na⁺ 133 but tonicity high; dry, orthostatic; urine glucose 4+.", danger: "Brain cells shrinking (drowsiness) and a low circulating volume." },
    needEcf: 'in', needCells: 'in', needNote: 'Fill the ECF first. The cells need water too, but fixing glucose with insulin will move water back into them.',
    safety: 'Use 0.9% saline first. Na⁺ will rise as glucose falls; that is expected. Track osmolality and aim for a fall of 3–8 mOsm/kg per hour, with glucose falling 4–6 mmol/L (72–108 mg/dL) per hour. Once corrected for glucose, Na⁺ should fall no more than 10 mmol/L in 24 h. Guidelines differ on when to start insulin; low-dose insulin usually follows fluids. Replace K⁺.',
    grades: {
      ns: ['best', 'Volume first. As glucose falls, water returns to cells and Na⁺ rises. Insulin follows once fluids are under way.'],
      lr: ['ok', 'Also refills volume.'],
      d5w: ['harmful', 'Adds glucose to a patient whose problem is glucose.'],
      hts: ['harmful', 'Tonicity is already high.'],
      restrict: ['harmful', 'The patient is dry.'],
      loop: ['harmful', 'Removes more volume.'],
    },
  },
  {
    id: 'marathon', optional: true, title: 'Confused at the finish line',
    story: '28-year-old marathon runner, 4-hour race, drank water at every station. Now confused and vomiting.',
    danger: { brain: 'Confused, vomiting, headache: symptoms of brain swelling.', circulation: 'HR 92, BP 118/74, not orthostatic.' },
    exam: ['Not orthostatic', 'Normal neck veins', 'Moist mucous membranes', 'No edema; weight up about 1 kg'],
    volume: 'euvolemic', volumeAlso: ['dry'], volumeNote: 'Close to normal. Sweat salt loss shrank the ECF slightly, but not enough to detect at the bedside.',
    events: [fluid(-3, 100), fluid(4.8, 0)],
    icfNote: 'Tonicity is down, so water moved into the cells. Brain cells swelled: that is the confusion.',
    urine: { osm: 450, na: 40 },
    water: 'holding', salt: 'losing',
    kidneyNote: 'Concentrated urine despite low Na⁺: ADH is still on, driven by nausea, exercise and stress. Inappropriate for the tonicity.',
    causes: [{ text: 'Sweat salt loss alone' }, { text: 'Overdrinking with ADH still on', correct: true }, { text: 'Heart failure' }, { text: 'Diabetes insipidus' }],
    causeNote: 'Sweat lost some salt, but the large free-water gain with ADH on is what dropped Na⁺.',
    chain: ['Sweat loses salt and water during the race', 'Large free-water intake while ADH is on', 'ECF osmolality falls below the cells', 'Water moves into the cells', 'Brain cells swell: confusion and vomiting'],
    dangerKey: 'brain', dangerNote: "Confused and vomiting with a normal BP: the brain is in danger (cells swelling). The circulation is fine.",
    kidneyRole: 'problem', roleNote: "Urine osm 450 with Na⁺ 131: ADH is still on (exercise, nausea, stress), so the kidney keeps water it should be getting rid of. It is part of the problem.",
    debrief: { who: "Endurance athlete who drank water at every station.", what: "Sweat lost salt and water. Drinking replaced it with more free water than was lost, while ADH stayed on and the kidney kept it. ECF tonicity fell and water moved into cells.", findings: "Confusion, vomiting, headache, weight up; Na⁺ 131; concentrated urine.", danger: "Brain swelling (exercise-associated hyponatremia). An emergency: recognize it, stop further water and call for help. An experienced team corrects the sodium, because too slow or too fast both injure the brain." },
    needEcf: 'none', needCells: 'out', needNote: 'Volume is about right. Brain cells are swollen, so water has to come out of them.',
    adhUosm: 450,
    specialist: true,
    safety: 'Confusion and vomiting after overdrinking mean the brain is swelling. This is an emergency. An experienced team decides and monitors treatment, because raising sodium too slowly or too fast can both injure the brain. Your role: recognize it, call for help, and stop any further water. Give no IV fluids unless the team directs it.',
    grades: {
      hts: ['best', 'Symptomatic: a small hypertonic bolus raises tonicity and pulls water out of brain cells fast, with little volume. Recheck Na⁺ before repeating it.'],
      restrict: ['ok', 'Right direction, but too slow for a confused, vomiting patient.'],
      ns: ['harmful', 'With ADH on, the kidney excretes the salt in concentrated urine and keeps the water. Na⁺ falls further.'],
      lr: ['harmful', 'Hypotonic to this urine: adds free water and lowers Na⁺.'],
      d5w: ['harmful', 'Pure free water into swollen brain cells.'],
      loop: ['ok', 'Can help shed free water, but does not act fast enough on its own.'],
    },
  },
  {
    id: 'addison', optional: true, title: 'Weak, dizzy and darker skin',
    story: '41-year-old with months of fatigue, weight loss and salt craving. Skin creases look darker.',
    danger: { brain: 'Tired but oriented.', circulation: 'HR 112, BP 88/54, faint on standing.' },
    exam: ['Orthostatic hypotension', 'Flat neck veins', 'Dry mucous membranes', 'Hyperpigmented palmar creases'],
    volume: 'dry', volumeNote: 'Orthostatic, flat JVP, dry mucosa: the ECF is down.',
    events: [fluid(-2, 650)],
    icfNote: 'Salt was lost faster than water, so tonicity fell and water moved into the cells. They are swollen even though the patient is dry.',
    urine: { osm: 400, na: 60 },
    water: 'holding', salt: 'losing',
    kidneyNote: 'Dry, yet urine Na⁺ is high: the kidney is wasting salt. Without aldosterone it cannot hold it. Inappropriate.',
    causes: [{ text: 'Diarrhea' }, { text: 'Adrenal insufficiency (no aldosterone)', correct: true }, { text: 'SIADH' }, { text: 'Heart failure' }],
    causeNote: 'A dry patient losing salt in the urine means the kidney is the problem. Diuretics also do this; the history and skin point to Addison’s.',
    chain: ['No aldosterone', 'The kidney loses salt faster than water', 'ECF shrinks and its osmolality falls', 'Water moves into the cells', 'Dizzy and dry, yet Na⁺ is low'],
    dangerKey: 'circulation', dangerNote: "BP 88/54 and faint on standing: the circulation is in danger. Tired but oriented.",
    kidneyRole: 'problem', roleNote: "Urine Na⁺ 60 in a dry patient: the kidney is losing salt when it should be holding it. Without aldosterone it cannot hold it.",
    debrief: { who: "Adult with months of fatigue, weight loss, salt craving and darker skin.", what: "Without aldosterone the kidney wastes salt and the ECF shrinks. The volume loss turns ADH on, so water is kept and tonicity falls; water moves into cells.", findings: "Hypotension, orthostatic, dry; Na⁺ 130, high Hct; urine Na⁺ 60; darker skin creases.", danger: "Circulation: adrenal crisis can cause shock. An emergency." },
    needEcf: 'in', needCells: 'out', needNote: 'Fill the ECF with salt. Restoring tonicity will draw water back out of the cells.',
    safety: 'Give hydrocortisone 100 mg IV at once; do not wait for test results. Overshoot risk: once volume and cortisol are restored, ADH switches off and a water diuresis can raise Na⁺ too fast. Check Na⁺ every 2–4 h and keep the rise within 8–10 mmol/L in 24 h. If it rises faster, D5W or desmopressin can bring it back down.',
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
    id: 'dehydration', optional: true, title: 'Found at home after a hot weekend',
    story: '84-year-old with dementia, found at home after a heat wave. Has not been drinking.',
    danger: { brain: 'Drowsy and confused.', circulation: 'HR 104, BP 108/66, mildly orthostatic.' },
    exam: ['Mildly orthostatic', 'Flat neck veins', 'Very dry mucous membranes', 'No edema'],
    volume: 'dry', volumeNote: 'Mildly dry. Most of the water lost came from the cells, so the ECF fell less than you might expect.',
    events: [fluid(-4, 0)],
    icfNote: 'Tonicity is up, so water moved out of the cells. Brain cells have shrunk: that is the drowsiness.',
    urine: { osm: 900, na: 15 },
    water: 'holding', salt: 'holding',
    kidneyNote: 'Maximally concentrated urine: ADH is working hard. Appropriate.',
    causes: [{ text: 'Diabetes insipidus' }, { text: 'Salt ingestion' }, { text: 'Osmotic diuresis' }, { text: 'Not drinking (no access to water)', correct: true }],
    causeNote: 'The kidney is doing everything right; the problem is intake. DI would make dilute urine.',
    chain: ['No water intake through a heat wave', 'The ECF loses free water; its osmolality rises above the cells', 'Water moves out of the cells', 'Brain cells shrink: drowsiness'],
    dangerKey: 'both', dangerNote: "Drowsy and confused (brain) and orthostatic (circulation): both are in danger.",
    kidneyRole: 'homeostatic', roleNote: "Very concentrated urine with low Na⁺: the kidney is holding every drop of water and salt. It is doing its job; the problem is intake.",
    debrief: { who: "Frail older adult with dementia, alone through a heat wave.", what: "Water kept being lost but none was drunk. The ECF lost free water, tonicity rose and water left the cells.", findings: "Drowsy, very dry, orthostatic; Na⁺ 155; urine osm 900.", danger: "Brain cells shrinking, and a low circulating volume." },
    needEcf: 'in', needCells: 'in', needNote: 'Mostly cells need water back; the ECF needs a little.',
    safety: 'Treat shock first with saline. Then lower Na⁺ no faster than 0.5 mmol/L per hour (10–12 mmol/L in 24 h) when the hypernatremia is chronic or of unknown duration; faster lowering risks cerebral edema. Check Na⁺ every 2–4 h.',
    grades: {
      d5w: ['best', 'Free water goes where it is needed: mostly into the cells. Lower Na⁺ by no more than 10–12 mmol/L in 24 h.'],
      ns: ['ok', 'Use first only if hypotensive. It is hypotonic to this patient, but barely restores cell water.'],
      lr: ['ok', 'Similar to saline: fills volume, slow to fix tonicity.'],
      hts: ['harmful', 'Shrinks cells that are already shrunken.'],
      restrict: ['harmful', 'The patient needs water.'],
      loop: ['harmful', 'Removes more water.'],
    },
  },
  {
    id: 'di', optional: true, title: 'Thirsty on lithium',
    story: '45-year-old on lithium for 10 years. Passing large volumes of urine, constantly thirsty. Admitted after a fall; no water overnight.',
    danger: { brain: 'Irritable and confused.', circulation: 'HR 98, BP 118/72, not orthostatic.' },
    exam: ['Mildly orthostatic', 'Normal neck veins', 'Dry mucous membranes', 'No edema'],
    volume: 'dry', volumeAlso: ['euvolemic'], volumeNote: 'Mildly dry. Pure water loss comes two-thirds from cells, so the ECF changes little.',
    events: [fluid(-3.5, 0)],
    icfNote: 'Tonicity is up, so water moved out of the cells. They have shrunk.',
    urine: { osm: 90, na: 15 },
    water: 'dumping', salt: 'holding',
    kidneyNote: 'Dilute urine while Na⁺ is high: the kidney cannot hold water. Inappropriate.',
    causes: [{ text: 'Not drinking alone' }, { text: 'Osmotic diuresis' }, { text: 'Nephrogenic diabetes insipidus (lithium)', correct: true }, { text: 'SIADH' }],
    causeNote: 'High Na⁺ with dilute urine means the kidney is losing water. Lithium blocks ADH’s effect.',
    chain: ["Lithium blocks ADH's action in the kidney", 'The kidney passes large volumes of dilute urine', 'No water overnight: ECF osmolality rises above the cells', 'Water moves out of the cells', 'Cells shrink; Na⁺ is high'],
    dangerKey: 'brain', dangerAlso: ["both"], dangerNote: "Irritable and confused: the brain is in danger. BP is normal and only mildly orthostatic, so the circulation is less of a concern (both is acceptable).",
    kidneyRole: 'problem', roleNote: "Dilute urine (osm 90) with Na⁺ 153: the kidney is getting rid of water it should be holding. Lithium blocks ADH’s action.",
    debrief: { who: "Adult on lithium for years.", what: "Lithium makes the kidney resistant to ADH (nephrogenic diabetes insipidus). Thirst kept up with the water loss until there was no water overnight; tonicity rose and water left the cells.", findings: "Large urine volumes, thirst, confusion; Na⁺ 153; urine osm 90.", danger: "Brain cells shrinking. It worsens fast whenever the patient cannot drink." },
    needEcf: 'none', needCells: 'in', needNote: 'The cells need water back; volume is close to normal.',
    safety: 'Lower Na⁺ no more than 10–12 mmol/L in 24 h if it is chronic. Large volumes of D5W can cause hyperglycemia, which drives more urine loss; oral water is preferred if the patient can drink. Review lithium with the prescriber, as nephrogenic DI can persist after it is stopped.',
    grades: {
      d5w: ['best', 'Free water refills the cells. Also stop or review the lithium.'],
      ns: ['ok', 'Not harmful, but slow to fix tonicity, and the salt load increases urine output.'],
      lr: ['ok', 'Similar to saline.'],
      hts: ['harmful', 'Shrinks cells further.'],
      restrict: ['harmful', 'This kidney cannot conserve water; restriction is dangerous.'],
      loop: ['harmful', 'More water loss.'],
    },
  },
];
