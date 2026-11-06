/*
 * Darrow–Yannett at the Bedside
 * Copyright (c) 2026 Ian Victor Joseph Murray · CC BY-NC-SA 4.0
 * http://creativecommons.org/licenses/by-nc-sa/4.0/
 */
import React, { useMemo, useState } from 'react';
import { BASE, labs, run, treat, State } from './engine';
import { CASES, FLUIDS, FluidId, Need, Vol } from './cases';

const CARD_URL = 'card.html';
const STEPS = ['Danger', 'Wet or dry', 'Sodium', 'Cells', 'Kidney', 'Treatment'];
const NORMAL_TON = 285;
const ICF_SNAPS: Record<-1 | 0 | 1, number> = { [-1]: 23, 0: 28, 1: 33 };
const TON_SNAPS: Record<-1 | 0 | 1, number> = { [-1]: 250, 0: NORMAL_TON, 1: 320 };

type Snap = -1 | 0 | 1;
type Result = { vol?: boolean; osm?: boolean; icf?: boolean; water?: boolean; salt?: boolean; cause?: boolean; ecfNeed?: boolean; cellNeed?: boolean; fluid?: 'best' | 'ok' | 'harmful' };

const f0 = (n: number) => Math.round(n).toString();
const f1 = (n: number) => n.toFixed(1);
const dirOf = (d: number, eps: number): Snap => (d > eps ? 1 : d < -eps ? -1 : 0);

// ---------- Diagram ----------
type DiagramProps = {
  ecf: number | null; icf: number; ton: number | null;
  ghost?: { ecf: number; icf: number; ton: number } | null;
  predict?: 'icf' | 'ton' | null;   // main blocks are the student's prediction (drawn dashed)
  wrongIcf?: number | null;         // outline of a wrong ICF prediction, kept after Check
  wrongTon?: number | null;         // line of a wrong tonicity prediction, kept after Check
  arrow?: Snap | null;              // water across the membrane: 1 into cells, -1 out, 0 no shift
};

function Diagram({ ecf, icf, ton, ghost, predict, wrongIcf, wrongTon, arrow }: DiagramProps) {
  const W = 600, H = 320, PX = 9, left = 52, mem = left + 36 * PX, top = 24, bottom = 262, MAX = 380;
  const y = (o: number) => bottom - (Math.min(o, MAX) / MAX) * (bottom - top);
  const tonY = y(ton ?? NORMAL_TON);
  // Geometry as both attributes and style, so size changes animate.
  const box = (x: number, yy: number, w: number, h: number) =>
    ({ x, y: yy, width: w, height: h, style: { x, y: yy, width: w, height: h } as React.CSSProperties });
  const ay = tonY + (bottom - tonY) * 0.42;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dy-svg" role="img"
      aria-label={`${predict ? 'Your prediction: ' : ''}ICF ${f1(icf)} liters${ecf != null ? `, ECF ${f1(ecf)} liters` : ''}${ton != null ? `, tonicity ${f0(ton)}` : ''}`}>
      {[0, 100, 200, 300].map(t => (
        <g key={t}>
          <line x1={left} x2={W - 12} y1={y(t)} y2={y(t)} className="grid" />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
        </g>
      ))}
      <text x={14} y={(top + bottom) / 2} textAnchor="middle" className="tick" transform={`rotate(-90 14 ${(top + bottom) / 2})`}>Tonicity (mOsm/L)</text>

      {/* compartments */}
      <rect {...box(mem - icf * PX, tonY, icf * PX, bottom - tonY)} className={`icf ${predict ? 'pred' : ''}`} />
      {ecf != null && <rect {...box(mem, tonY, ecf * PX, bottom - tonY)} className={`ecf ${predict === 'ton' ? 'pred' : ''}`} />}

      {/* before-treatment outline */}
      {ghost && <>
        <rect x={mem - ghost.icf * PX} y={y(ghost.ton)} width={ghost.icf * PX} height={bottom - y(ghost.ton)} className="ghost" />
        <rect x={mem} y={y(ghost.ton)} width={ghost.ecf * PX} height={bottom - y(ghost.ton)} className="ghost" />
      </>}

      {/* normal outlines */}
      <rect x={mem - BASE.icf * PX} y={y(NORMAL_TON)} width={BASE.icf * PX} height={bottom - y(NORMAL_TON)} className="normal" />
      <rect x={mem} y={y(NORMAL_TON)} width={BASE.ecf * PX} height={bottom - y(NORMAL_TON)} className="normal" />
      <line x1={left} x2={W - 12} y1={y(NORMAL_TON)} y2={y(NORMAL_TON)} className="ref" />
      <text x={W - 14} y={y(NORMAL_TON) - 6} textAnchor="end" className="reftext">normal 285</text>

      {/* a wrong prediction stays visible next to the answer */}
      {wrongIcf != null && <>
        <rect x={mem - wrongIcf * PX} y={tonY} width={wrongIcf * PX} height={bottom - tonY} className="wrongpred" />
        <text x={mem - wrongIcf * PX + 6} y={tonY - 6} className="predtext">your prediction</text>
      </>}
      {wrongTon != null && <>
        <line x1={left} x2={W - 12} y1={y(wrongTon)} y2={y(wrongTon)} className="wrongline" />
        <text x={left + 6} y={y(wrongTon) - 6} className="predtext">your prediction</text>
      </>}
      {predict === 'ton' && <text x={left + 6} y={tonY - 6} className="predtext">your line</text>}

      <line x1={mem} x2={mem} y1={top - 8} y2={bottom} className="membrane" />
      <text x={mem} y={top - 12} textAnchor="middle" className="tick">cell membrane</text>

      {/* water across the membrane */}
      {arrow === 1 && <g className="arrow">
        <line x1={mem + 56} x2={mem - 52} y1={ay} y2={ay} />
        <path d={`M ${mem - 64} ${ay} l 14 -8 v 16 z`} />
        <text x={mem} y={ay - 12} textAnchor="middle" className="arrowtext">water in</text>
      </g>}
      {arrow === -1 && <g className="arrow">
        <line x1={mem - 56} x2={mem + 52} y1={ay} y2={ay} />
        <path d={`M ${mem + 64} ${ay} l -14 -8 v 16 z`} />
        <text x={mem} y={ay - 12} textAnchor="middle" className="arrowtext">water out</text>
      </g>}
      {arrow === 0 && <text x={mem} y={ay} textAnchor="middle" className="arrowtext">no water shift</text>}

      <text x={mem - (icf * PX) / 2} y={bottom - 14} textAnchor="middle" className="lab icf-t">{predict === 'icf' ? 'ICF (your prediction)' : 'ICF'}</text>
      {ecf != null && <text x={mem + (ecf * PX) / 2} y={bottom - 14} textAnchor="middle" className="lab ecf-t">ECF</text>}
      {ecf == null && <text x={mem + 63} y={(top + bottom) / 2 + 30} textAnchor="middle" className="tick">ECF: examine first</text>}

      <line x1={left} x2={W - 12} y1={bottom} y2={bottom} className="axis" />
      {[30, 20, 10].map(v => <text key={`i${v}`} x={mem - v * PX} y={bottom + 16} textAnchor="middle" className="tick">{v}</text>)}
      {[10, 20].map(v => <text key={`e${v}`} x={mem + v * PX} y={bottom + 16} textAnchor="middle" className="tick">{v}</text>)}
      <text x={mem - 10} y={bottom + 38} textAnchor="end" className="tick">← ICF volume (L)</text>
      <text x={mem + 10} y={bottom + 38} className="tick">ECF volume (L) →</text>
    </svg>
  );
}

// ---------- small UI pieces ----------
function Choice<T extends string | number>({ options, value, onPick, disabled, label }: {
  options: { v: T; text: string }[]; value: T | undefined; onPick: (v: T) => void; disabled?: boolean; label: string;
}) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.v)} aria-pressed={value === o.v} disabled={disabled} onClick={() => onPick(o.v)}>{o.text}</button>
      ))}
    </div>
  );
}

const Verdict = ({ ok, children }: { ok: boolean | 'ok'; children: React.ReactNode }) => (
  <div className={`verdict ${ok === true ? 'good' : ok === 'ok' ? 'meh' : 'bad'}`}>
    <b>{ok === true ? 'Correct.' : ok === 'ok' ? 'Partly.' : 'Not quite.'}</b> {children}
  </div>
);

const NEED_TEXT: Record<'ecf' | 'cells', Record<Need, string>> = {
  ecf: { in: 'Fill it', none: 'Leave it', out: 'Remove fluid' },
  cells: { in: 'Water in', none: 'Leave them', out: 'Water out' },
};


// ---------- Reference ----------
const SOURCES: { text: string; url: string }[] = [
  { text: 'Spasovski G, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. Eur J Endocrinol 2014;170:G1–G47', url: 'https://doi.org/10.1530/EJE-13-1020' },
  { text: 'Verbalis JG, et al. Diagnosis, evaluation, and treatment of hyponatremia: expert panel recommendations. Am J Med 2013;126:S1–S42', url: 'https://doi.org/10.1016/j.amjmed.2013.07.006' },
  { text: 'Bennett BL, et al. Wilderness Medical Society guidelines for exercise-associated hyponatremia: 2019 update. Wilderness Environ Med 2020;31:50–62', url: 'https://www.aafp.org/pubs/afp/issues/2021/0215/p252.html' },
  { text: 'Perianayagam A, et al. DDAVP is effective in preventing and reversing inadvertent overcorrection of hyponatremia. Clin J Am Soc Nephrol 2008;3:331–336', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2390955' },
  { text: 'Adrogué HJ, Madias NE. Hypernatremia. N Engl J Med 2000;342:1493–1499', url: 'https://doi.org/10.1056/NEJM200005183422006' },
  { text: 'Joint British Diabetes Societies. Management of the hyperosmolar hyperglycaemic state (HHS) in adults', url: 'https://www.rcemlearning.co.uk/reference/hyperosmolar-hyperglycaemic-state/' },
  { text: 'Society for Endocrinology. Emergency management of adrenal crisis', url: 'https://endocrinology.org/adrenal-crisis' },
];

const STATES: [string, string, string, string][] = [
  ['Na⁺ ↑ · ECF ↓', 'Hyperosmotic contraction', 'Sweating, poor water intake, diabetes insipidus', 'Cells shrink'],
  ['Na⁺ ↑ · ECF ↑', 'Hyperosmotic expansion', 'Hypertonic saline, salt ingestion, NaHCO₃', 'Cells shrink'],
  ['Na⁺ — · ECF ↓', 'Isosmotic contraction', 'Diarrhea, hemorrhage, burns', 'No shift'],
  ['Na⁺ — · ECF ↑', 'Isosmotic expansion', 'Isotonic saline overload', 'No shift'],
  ['Na⁺ ↓ · ECF ↓', 'Hyposmotic contraction', 'Diuretics, adrenal insufficiency, losses replaced with water', 'Cells swell'],
  ['Na⁺ ↓ · ECF ↑', 'Hyposmotic expansion', 'SIADH, water intoxication, heart failure, cirrhosis', 'Cells swell'],
];

function Reference({ onClose }: { onClose: () => void }) {
  return (
    <section className="panel refpage" aria-label="Reference">
      <div className="row"><h2 style={{ margin: 0 }}>Reference</h2><span className="spacer" style={{ flex: 1 }} /><button className="linkbtn" onClick={onClose}>Back to the case</button></div>

      <p><a href={CARD_URL}>Post-activity card: Darrow–Yannet, read backward</a> (printable, one page).</p>

      <h3>The diagram</h3>
      <ul>
        <li>The cell membrane is the vertical line. ICF (cells, pink) is on the left; ECF (green) is on the right.</li>
        <li>Block width is volume (L). Block height is tonicity (mOsm/L). Dashed outlines show normal: ICF 28 L, ECF 14 L, tonicity 285.</li>
        <li>Tonicity ≈ 2 × Na⁺ + glucose/18 (glucose in mg/dL). Urea crosses cell membranes, so it raises measured osmolality but does not move water.</li>
        <li>Water moves until both sides have the same tonicity: tonicity down → cells swell; tonicity up → cells shrink.</li>
      </ul>

      <h3>The six bedside steps</h3>
      <ol>
        <li><b>Danger.</b> The brain reports on cell volume (tonicity); the circulation reports on the ECF.</li>
        <li><b>Wet or dry.</b> Orthostatics, JVP, edema, mucous membranes and weight tell you what the ECF is doing.</li>
        <li><b>Sodium.</b> Na⁺ and glucose set the tonicity line: above, at or below 285.</li>
        <li><b>Cells.</b> Water follows tonicity: in, out or no shift.</li>
        <li><b>Kidney.</b> Urine osmolality and urine Na⁺ show whether the kidney is holding or losing water and salt, and point to the cause.</li>
        <li><b>Treatment.</b> Decide where salt and water need to go, then pick a fluid.</li>
      </ol>

      <h3>The six states</h3>
      <table className="reftable"><thead><tr><th>Na⁺ · ECF</th><th>State</th><th>Common causes</th><th>Cells</th></tr></thead>
        <tbody>{STATES.map(r => <tr key={r[1]}>{r.map((x, k) => <td key={k}>{x}</td>)}</tr>)}</tbody></table>

      <h3>The kidney's vote</h3>
      <table className="reftable"><tbody>
        <tr><td>U<sub>osm</sub> &gt; 100</td><td>Holding water (ADH on)</td></tr>
        <tr><td>U<sub>osm</sub> &lt; 100</td><td>Dumping water (ADH off)</td></tr>
        <tr><td>U<sub>Na</sub> &lt; 20</td><td>Holding salt: the kidney senses low perfusion</td></tr>
        <tr><td>U<sub>Na</sub> &gt; 20</td><td>Losing salt, or perfusion is fine</td></tr>
      </tbody></table>
      <p className="hint">Traps: high glucose lowers Na⁺ while cells shrink. SIADH looks euvolemic because only a third of retained water stays in the ECF. Low effective volume turns ADH on even when Na⁺ is low.</p>

      <h3>Fluids and where they go</h3>
      <table className="reftable"><thead><tr><th>Option</th><th>Content</th><th>Where it goes</th></tr></thead><tbody>
        <tr><td>0.9% saline</td><td>Na⁺ 154 (308 mOsm/L)</td><td>Stays in the ECF. If ADH is on and urine is more concentrated than 308, the salt is excreted and the water kept, so Na⁺ falls.</td></tr>
        <tr><td>Lactated Ringer's</td><td>Na⁺ 130 (273 mOsm/L)</td><td>Mostly ECF; slightly hypotonic.</td></tr>
        <tr><td>D5W</td><td>Free water once glucose is used</td><td>Spreads across all body water: about two-thirds into cells.</td></tr>
        <tr><td>3% saline</td><td>Na⁺ 513 (1026 mOsm/L)</td><td>Raises tonicity and pulls water out of cells. Emergency bolus only.</td></tr>
        <tr><td>Fluid restriction</td><td>Less free water in</td><td>Na⁺ rises slowly.</td></tr>
        <tr><td>Loop diuretic</td><td>Urine Na⁺ about 70</td><td>Removes salt and more water: hypotonic loss.</td></tr>
      </tbody></table>

      <h3>Safety: sodium speed limits</h3>
      <ul>
        <li><b>Chronic hyponatremia</b> (over 48 h or unknown): raise Na⁺ no more than 8–10 mmol/L in 24 h, and no more than 8 if risk is high (Na⁺ ≤105, low K⁺, alcohol use, malnutrition, liver disease). Faster rises can cause osmotic demyelination days later.</li>
        <li><b>Severe symptoms</b> (seizures, coma, confusion with vomiting): 3% saline bolus (European guideline 150 mL; Wilderness Medical Society 100 mL for exercise-associated hyponatremia), recheck Na⁺, and repeat until symptoms improve or Na⁺ has risen 5 mmol/L.</li>
        <li><b>Watch for overshoot</b> when the cause of ADH release goes away: volume restored, cortisol replaced, thiazide or SSRI stopped. A water diuresis can raise Na⁺ fast; D5W or desmopressin can bring it back down.</li>
        <li><b>Chronic hypernatremia:</b> lower Na⁺ no faster than 0.5 mmol/L per hour (10–12 mmol/L in 24 h). Faster lowering risks cerebral edema. Treat shock first.</li>
        <li><b>HHS:</b> 0.9% saline first; a rising Na⁺ is expected as glucose falls. Aim for an osmolality fall of 3–8 mOsm/kg per hour.</li>
        <li><b>Adrenal crisis:</b> hydrocortisone 100 mg IV at once, with 0.9% saline.</li>
      </ul>

      <h3>The cases</h3>
      <table className="reftable"><thead><tr><th>Case</th><th>Cause</th><th>Best first treatment</th><th>Safety</th></tr></thead><tbody>
        {CASES.map((k, i) => {
          const best = (Object.keys(FLUIDS) as FluidId[]).filter(f => k.grades[f]?.[0] === 'best').map(f => FLUIDS[f].name).join(' or ');
          return <tr key={k.id}><td>{i + 1}. {k.title}</td><td>{k.causes.find(x => x.correct)?.text}</td><td>{best}</td><td>{k.safety}</td></tr>;
        })}
      </tbody></table>

      <h3>Teaching model</h3>
      <p>42 L total body water (ICF 28 L, ECF 14 L). Only Na⁺ salts and glucose are effective osmoles; ICF solute is fixed. Urine values are illustrative. Each treatment shows a single dose; real care rechecks Na⁺ every 2–6 h. This is a teaching tool, not a dosing guide.</p>

      <h3>Sources</h3>
      <ol className="sources">{SOURCES.map(x => <li key={x.url}><a href={x.url} target="_blank" rel="noopener">{x.text}</a></li>)}</ol>
    </section>
  );
}

// ---------- App ----------
export default function BedsideFlow() {
  const [ci, setCi] = useState(0);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [vol, setVol] = useState<Vol>();
  const [tonGuess, setTonGuess] = useState<Snap>();
  const [tonChecked, setTonChecked] = useState(false);
  const [icfGuess, setIcfGuess] = useState<Snap>();
  const [icfChecked, setIcfChecked] = useState(false);
  const [water, setWater] = useState<'holding' | 'dumping'>();
  const [salt, setSalt] = useState<'holding' | 'losing'>();
  const [cause, setCause] = useState<number>();
  const [kidneyChecked, setKidneyChecked] = useState(false);
  const [needEcf, setNeedEcf] = useState<Need>();
  const [needCells, setNeedCells] = useState<Need>();
  const [needChecked, setNeedChecked] = useState(false);
  const [fluid, setFluid] = useState<FluidId>();
  const [result, setResult] = useState<Result>({});
  const [flash, setFlash] = useState(0);
  const [history, setHistory] = useState<Record<string, Result>>({});
  const [showRef, setShowRef] = useState(false);

  const c = CASES[ci];
  const truth = useMemo(() => run(c.events).final, [ci]);
  const L = labs(truth);
  const labNa = Math.round(L.na);
  const gluC = L.glucose / 18;
  const truthIcfDir = dirOf(truth.icf - BASE.icf, 0.1);

  const treated: State | null = fluid ? treat(truth, FLUIDS[fluid].event, c.adhUosm) : null;
  const TL = treated ? labs(treated) : null;

  const reset = (i: number) => {
    setCi(i); setStep(0); setMaxStep(0); setVol(undefined); setTonGuess(undefined); setTonChecked(false); setIcfGuess(undefined); setIcfChecked(false);
    setWater(undefined); setSalt(undefined); setCause(undefined); setKidneyChecked(false);
    setNeedEcf(undefined); setNeedCells(undefined); setNeedChecked(false); setFluid(undefined); setResult({});
  };

  const volOk = vol != null && (vol === c.volume || (c.volumeAlso ?? []).includes(vol));
  const truthTonDir = dirOf(L.effOsm - NORMAL_TON, 5);

  // What the diagram shows at each step
  const showEcf = step >= 1 && vol != null ? truth.ecf : null;
  const ton = step < 2 ? null : step > 2 || tonChecked ? L.effOsm : tonGuess != null ? TON_SNAPS[tonGuess] : NORMAL_TON;
  const icfShown = step < 3 ? BASE.icf : icfChecked || step > 3 ? truth.icf : icfGuess != null ? ICF_SNAPS[icfGuess] : BASE.icf;
  const diag = step === 5 && treated && TL
    ? <Diagram ecf={treated.ecf} icf={treated.icf} ton={TL.effOsm} ghost={{ ecf: truth.ecf, icf: truth.icf, ton: L.effOsm }} />
    : <Diagram ecf={showEcf} icf={icfShown} ton={ton}
        predict={step === 2 && !tonChecked && tonGuess != null ? 'ton' : step === 3 && !icfChecked && icfGuess != null ? 'icf' : null}
        wrongTon={step === 2 && tonChecked && tonGuess != null && tonGuess !== truthTonDir ? TON_SNAPS[tonGuess] : null}
        wrongIcf={step === 3 && icfChecked && icfGuess != null && icfGuess !== truthIcfDir ? ICF_SNAPS[icfGuess] : null}
        arrow={step === 3 ? (icfChecked ? truthIcfDir : icfGuess ?? null) : null} />;

  // Only the first answer to each question is scored; Redo and Back never change it.
  const record = (r: Result) => setResult(prev => {
    const next: Result = { ...prev };
    (Object.keys(r) as (keyof Result)[]).forEach(k => { if (next[k] === undefined) (next as any)[k] = r[k]; });
    return next;
  });
  const pickTon = (v: Snap) => { setTonGuess(v); setFlash(f => f + 1); };
  const pickIcf = (v: Snap) => { setIcfGuess(v); setFlash(f => f + 1); };
  const go = (n: number) => { setStep(n); setMaxStep(m => Math.max(m, n)); };
  const redo = (n: number) => {
    if (n === 1) setVol(undefined);
    if (n === 2) { setTonGuess(undefined); setTonChecked(false); }
    if (n === 3) { setIcfGuess(undefined); setIcfChecked(false); }
    if (n === 4) { setWater(undefined); setSalt(undefined); setCause(undefined); setKidneyChecked(false); }
    if (n === 5) { setNeedEcf(undefined); setNeedCells(undefined); setNeedChecked(false); setFluid(undefined); }
  };
  const resetBtn = (n: number) => (
    <button className="linkbtn" onClick={() => redo(n)} title="Clear your answer to this step and try again. Your first answer is still the one scored.">Reset this step</button>
  );
  const answered = [true, vol != null, tonChecked, icfChecked, kidneyChecked, needChecked][step] ?? false;
  const finish = () => { setHistory(h => ({ ...h, [c.id]: result })); go(6); };

  const scoreOf = (r: Result) => {
    const keys: (keyof Result)[] = ['vol', 'osm', 'icf', 'water', 'salt', 'cause', 'ecfNeed', 'cellNeed'];
    const pts = keys.filter(k => r[k] === true).length + (r.fluid === 'best' ? 1 : r.fluid === 'ok' ? 0.5 : 0);
    return { pts, of: 9 };
  };

  return (
    <div className="dy">
      <header className="top">
        <div>
          <div className="eyebrow">Body fluids at the bedside</div>
          <h1>Darrow–Yannett at the Bedside</h1>
        </div>
        <label className="casepick">
          <span>Case</span>
          <select id="case-select" value={ci} onChange={e => reset(Number(e.target.value))}>
            {CASES.map((k, i) => <option key={k.id} value={i}>{i + 1}. {k.title}</option>)}
          </select>
        </label>
      </header>

      <ol className="progress" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={!showRef && i === step ? 'now' : i <= maxStep ? 'done' : ''}>
            {i <= maxStep
              ? <button onClick={() => { setShowRef(false); setStep(i); }} aria-current={!showRef && i === step ? 'step' : undefined}><span>{i + 1}</span>{s}</button>
              : <div><span>{i + 1}</span>{s}</div>}
          </li>
        ))}
        <li className={showRef ? 'now ref' : 'ref'}>
          <button onClick={() => setShowRef(r => !r)} aria-pressed={showRef}><span>i</span>Reference</button>
        </li>
      </ol>

      {showRef && <Reference onClose={() => setShowRef(false)} />}

      <div className="layout" hidden={showRef}>
        <section className="panel" aria-live="polite">
          <div className="story">
            <div className="eyebrow">Case {ci + 1} of {CASES.length}</div>
            <h2>{c.title}</h2>
            <p>{c.story}</p>
          </div>

          <dl className="chart" aria-label="Patient chart">
            <div><dt>Vitals</dt><dd><span>{c.danger.circulation}</span><span>{c.danger.brain}</span></dd></div>
            {maxStep >= 1 && <div><dt>Exam</dt><dd>
              {c.exam.map(x => <span key={x}>{x}</span>)}
              {vol != null && <span className="you">You: {vol} · ECF {f1(truth.ecf)} L</span>}
            </dd></div>}
            {maxStep >= 2 && <div><dt>Labs</dt><dd>
              <span className="v">Na⁺ {labNa}</span>
              <span className="v">Glucose {f0(L.glucose)}</span>
              {(tonChecked || maxStep > 2) && <span className="v">Tonicity {f0(L.effOsm)}</span>}
              <span className="v">Hct {f0(L.hct)}%</span>
            </dd></div>}
            {(icfChecked || maxStep > 3) && maxStep >= 3 && <div><dt>Cells</dt><dd>
              <span className="v">ICF {f1(truth.icf)} L</span>
              <span>{truthIcfDir > 0 ? 'swollen' : truthIcfDir < 0 ? 'shrunken' : 'unchanged'}</span>
            </dd></div>}
            {maxStep >= 4 && <div><dt>Urine</dt><dd>
              <span className="v">U<sub>osm</sub> {c.urine.osm}</span>
              <span className="v">U<sub>Na</sub> {c.urine.na}</span>
              {c.urine.extra && <span>{c.urine.extra}</span>}
              {kidneyChecked && cause != null && <span className="you">You: {c.causes[cause].text}</span>}
            </dd></div>}
            {fluid && TL && <div><dt>Rx</dt><dd>
              <span className="you">{FLUIDS[fluid].name}</span>
              <span className="v">Na⁺ {labNa} → {f0(TL.na)}</span>
            </dd></div>}
          </dl>

          <div className="stepnav">
            {step > 0 && <button className="linkbtn" onClick={() => setStep(step - 1)}>← Back</button>}
            <span className="spacer" />
            {maxStep > 0 && <button className="linkbtn" onClick={() => reset(ci)}>Restart case</button>}
          </div>
          {step >= 1 && step <= 5 && answered && maxStep > step && <p className="hint">Reviewing an earlier step. Only your first answer is scored.</p>}

          {step === 0 && (
            <div className="stepbox">
              <h3>1 · Is anyone in danger?</h3>
              <p className="lead">Before any numbers, ask the two questions that matter.</p>
              <div className="danger">
                <div><span className="k">Brain</span><span>{c.danger.brain}</span></div>
                <div><span className="k">Circulation</span><span>{c.danger.circulation}</span></div>
              </div>
              <p className="hint">The brain tells you about cell volume (tonicity). The circulation tells you about the ECF.</p>
              <button className="primary" onClick={() => go(1)}>Examine the patient</button>
            </div>
          )}

          {step === 1 && (
            <div className="stepbox">
              <h3>2 · Wet or dry?</h3>
              <ul className="findings">{c.exam.map(x => <li key={x}>{x}</li>)}</ul>
              <p className="q">What is the ECF doing?</p>
              <Choice label="Volume status" value={vol} disabled={vol != null}
                options={[{ v: 'dry' as Vol, text: 'Dry (ECF down)' }, { v: 'euvolemic' as Vol, text: 'Euvolemic' }, { v: 'wet' as Vol, text: 'Wet (ECF up)' }]}
                onPick={v => { setVol(v); record({ vol: v === c.volume || (c.volumeAlso ?? []).includes(v) }); }} />
              {vol != null && <>
                <Verdict ok={volOk}>{c.volumeNote}</Verdict>
                <p className="hint">The ECF block now shows this patient's volume: {f1(truth.ecf)} L (normal 14).</p>
                <div className="row"><button className="primary" onClick={() => go(2)}>Check the sodium</button>{resetBtn(1)}</div>
              </>}
            </div>
          )}

          {step === 2 && (
            <div className="stepbox">
              <h3>3 · Where does sodium put the line?</h3>
              <p className="lead">Read Na⁺ and glucose in the Labs row above. Together they set the tonicity. Predict under the diagram; your answer is drawn on it.</p>
            </div>
          )}

          {step === 3 && (
            <div className="stepbox">
              <h3>4 · What did the cells do?</h3>
              <p className="lead">Water follows tonicity. Predict under the diagram; your answer is drawn on it.</p>
            </div>
          )}

          {step === 4 && (
            <div className="stepbox">
              <h3>5 · What is the kidney doing?</h3>
              <div className="labs">
                <div><span>Urine osm</span><b>{c.urine.osm}</b></div>
                <div><span>Urine Na⁺</span><b>{c.urine.na}</b></div>
                {c.urine.extra && <div><span>Also</span><b>{c.urine.extra}</b></div>}
              </div>
              <p className="q">Water</p>
              <Choice label="Water" value={water} disabled={kidneyChecked}
                options={[{ v: 'holding' as const, text: 'Holding water' }, { v: 'dumping' as const, text: 'Dumping water' }]} onPick={setWater} />
              <p className="q">Salt</p>
              <Choice label="Salt" value={salt} disabled={kidneyChecked}
                options={[{ v: 'holding' as const, text: 'Holding salt' }, { v: 'losing' as const, text: 'Losing salt' }]} onPick={setSalt} />
              <p className="q">So the cause is…</p>
              <div className="causes" role="group" aria-label="Cause">
                {c.causes.map((k, i) => (
                  <button key={k.text} aria-pressed={cause === i} disabled={kidneyChecked} onClick={() => setCause(i)}
                    className={kidneyChecked && k.correct ? 'right' : ''}>{k.text}</button>
                ))}
              </div>
              {!kidneyChecked && <button className="primary" disabled={water == null || salt == null || cause == null}
                onClick={() => { setKidneyChecked(true); record({ water: water === c.water, salt: salt === c.salt, cause: !!c.causes[cause!].correct }); }}>Check</button>}
              {kidneyChecked && <>
                <Verdict ok={water === c.water && salt === c.salt ? true : water === c.water || salt === c.salt ? 'ok' : false}>{c.kidneyNote}</Verdict>
                <Verdict ok={!!c.causes[cause!].correct}>{c.causeNote}</Verdict>
                <div className="row"><button className="primary" onClick={() => go(5)}>Treat</button>{resetBtn(4)}</div>
              </>}
            </div>
          )}

          {step === 5 && (
            <div className="stepbox">
              <h3>6 · Where do you want salt and water?</h3>
              <p className="q">The ECF needs…</p>
              <Choice label="ECF need" value={needEcf} disabled={needChecked}
                options={(['in', 'none', 'out'] as Need[]).map(v => ({ v, text: NEED_TEXT.ecf[v] }))} onPick={setNeedEcf} />
              <p className="q">The cells need…</p>
              <Choice label="Cell need" value={needCells} disabled={needChecked}
                options={(['in', 'none', 'out'] as Need[]).map(v => ({ v, text: NEED_TEXT.cells[v] }))} onPick={setNeedCells} />
              {!needChecked && <button className="primary" disabled={needEcf == null || needCells == null}
                onClick={() => { setNeedChecked(true); record({ ecfNeed: needEcf === c.needEcf, cellNeed: needCells === c.needCells }); }}>Check</button>}
              {needChecked && <>
                <Verdict ok={needEcf === c.needEcf && needCells === c.needCells ? true : needEcf === c.needEcf || needCells === c.needCells ? 'ok' : false}>{c.needNote}</Verdict>
                {!fluid && resetBtn(5)}
                <p className="q">Now pick what to give. Watch where it goes.</p>
                <p className="hint">Sodium speed limits: in chronic hyponatremia raise Na⁺ no more than 8–10 mmol/L in 24 h (risk: osmotic demyelination). In chronic hypernatremia lower it no more than 10–12 mmol/L in 24 h (risk: cerebral edema). The diagram shows one dose; real care rechecks Na⁺ every 2–6 h.</p>
                <div className="fluids" role="group" aria-label="Treatment">
                  {(Object.keys(FLUIDS) as FluidId[]).map(f => (
                    <button key={f} aria-pressed={fluid === f} onClick={() => { setFluid(f); if (result.fluid == null) record({ fluid: c.grades[f]?.[0] }); }}>
                      <b>{FLUIDS[f].name}</b><span>{FLUIDS[f].detail}</span>
                    </button>
                  ))}
                </div>
                {fluid && TL && <>
                  <div className="labs">
                    <div><span>Na⁺</span><b>{labNa} → {f0(TL.na)}</b></div>
                    <div><span>ECF</span><b>{f1(truth.ecf)} → {f1(treated!.ecf)} L</b></div>
                    <div><span>ICF</span><b>{f1(truth.icf)} → {f1(treated!.icf)} L</b></div>
                  </div>
                  <Verdict ok={c.grades[fluid]![0] === 'best' ? true : c.grades[fluid]![0] === 'ok' ? 'ok' : false}>{c.grades[fluid]![1]}</Verdict>
                  <div className="verdict meh"><b>Safety.</b> {c.safety}</div>
                  <p className="hint">Outline = before treatment. Try other options to compare; only your first choice is scored.</p>
                  <div className="row"><button className="primary" onClick={finish}>Finish case</button>{resetBtn(5)}</div>
                </>}
              </>}
            </div>
          )}

          {step === 6 && (() => {
            const s = scoreOf(result);
            const done = Object.keys({ ...history, [c.id]: result }).length;
            return (
              <div className="stepbox">
                <h3>Case complete</h3>
                <div className="scorebig mono">{s.pts} / {s.of}</div>
                <ul className="tally">
                  <li className={result.vol ? 'y' : 'n'}>Wet or dry</li>
                  <li className={result.osm ? 'y' : 'n'}>Tonicity line</li>
                  <li className={result.icf ? 'y' : 'n'}>Cells</li>
                  <li className={result.water ? 'y' : 'n'}>Kidney: water</li>
                  <li className={result.salt ? 'y' : 'n'}>Kidney: salt</li>
                  <li className={result.cause ? 'y' : 'n'}>Cause</li>
                  <li className={result.ecfNeed && result.cellNeed ? 'y' : 'n'}>Where salt and water go</li>
                  <li className={result.fluid === 'best' ? 'y' : result.fluid === 'ok' ? 'm' : 'n'}>First treatment</li>
                </ul>
                <p className="hint">{done} of {CASES.length} cases done.</p>
                <div className="row">
                  {ci < CASES.length - 1 && <button className="primary" onClick={() => reset(ci + 1)}>Next case</button>}
                  <a className="ghostbtn" href={CARD_URL}>Post-activity: Darrow–Yannett, read backward</a>
                </div>
              </div>
            );
          })()}
        </section>

        <section className="figure" aria-label="Darrow–Yannett diagram">
          {flash > 0 && <div key={flash} className="flash" aria-hidden="true" />}
          {diag}
          <div className="legend">
            <span><i className="sw icf" />ICF (cells)</span>
            <span><i className="sw ecf" />ECF</span>
            <span><i className="sw normal" />normal</span>
            {treated && <span><i className="sw ghost" />before treatment</span>}
          </div>

          {step === 2 && (
            <div className="predict">
              <p className="q">Using Na⁺ and glucose from the Labs row: where does the tonicity line go?</p>
              <Choice label="Tonicity line" value={tonGuess} disabled={tonChecked}
                options={[{ v: 1 as Snap, text: 'Above normal' }, { v: 0 as Snap, text: 'At normal' }, { v: -1 as Snap, text: 'Below normal' }]}
                onPick={pickTon} />
              {!tonChecked && <>
                <p className="hint">{tonGuess == null ? 'Pick one. Your prediction is drawn on the diagram.' : 'Your prediction is drawn dashed on the diagram.'}</p>
                <button className="primary" disabled={tonGuess == null}
                  onClick={() => { setTonChecked(true); record({ osm: tonGuess === truthTonDir }); }}>Check</button>
              </>}
              {tonChecked && <>
                <div className="formula mono">tonicity ≈ 2 × Na⁺ + glucose/18 = {f0(2 * labNa)} + {f0(gluC)} = <b>{f0(2 * labNa + gluC)}</b> (normal 285)</div>
                <Verdict ok={tonGuess === truthTonDir}>{L.glucose > 300
                  ? <>Na⁺ is low, but glucose pushes tonicity <b>above</b> normal. Sodium alone would have fooled you.</>
                  : <>Na⁺ {labNa} puts tonicity {truthTonDir > 0 ? 'above' : truthTonDir < 0 ? 'below' : 'at'} normal. The line now sits where this patient's water is.</>}</Verdict>
                <div className="row"><button className="primary" onClick={() => go(3)}>Predict the cells</button>{resetBtn(2)}</div>
              </>}
            </div>
          )}

          {step === 3 && (
            <div className="predict">
              <p className="q">Tonicity is {f0(L.effOsm)}. What did the cells do?</p>
              <Choice label="Cells" value={icfGuess} disabled={icfChecked}
                options={[{ v: -1 as Snap, text: 'Water out · cells shrink' }, { v: 0 as Snap, text: 'No shift' }, { v: 1 as Snap, text: 'Water in · cells swell' }]}
                onPick={pickIcf} />
              {!icfChecked && <>
                <p className="hint">{icfGuess == null ? 'Pick one. Your prediction is drawn on the diagram.' : 'Your prediction is drawn dashed on the diagram.'}</p>
                <button className="primary" disabled={icfGuess == null}
                  onClick={() => { setIcfChecked(true); record({ icf: icfGuess === truthIcfDir }); }}>Check</button>
              </>}
              {icfChecked && <>
                <Verdict ok={icfGuess === truthIcfDir}>{c.icfNote} ICF {f1(truth.icf)} L (normal 28).</Verdict>
                <div className="row"><button className="primary" onClick={() => go(4)}>Ask the kidney</button>{resetBtn(3)}</div>
              </>}
            </div>
          )}
        </section>
      </div>

      <footer>© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0 · Teaching model: 42 L body water, effective osmoles only; urine values are illustrative.</footer>
    </div>
  );
}
