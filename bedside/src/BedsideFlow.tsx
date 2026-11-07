/*
 * Darrow–Yannet at the Bedside
 * Copyright (c) 2026 Ian Victor Joseph Murray · CC BY-NC-SA 4.0
 * http://creativecommons.org/licenses/by-nc-sa/4.0/
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BASE, labs, run } from './engine';
import { CASES, Danger, Vol } from './cases';

const CARD_URL = 'card.html';
const STEPS = ['Danger', 'Wet or dry', 'Sodium', 'Cells', 'Kidney', 'Debrief'];
const NORMAL_TON = 285;
// Core cases come first in CASES; the rest are optional extra practice.
const CORE = CASES.filter(k => !k.optional).length;
const caseLabel = (i: number) => i < CORE
  ? `Case ${i + 1} of ${CORE}`
  : `Extra practice ${i - CORE + 1} of ${CASES.length - CORE} · not yet clinician-reviewed`;
const TON_SNAPS: Record<-1 | 0 | 1, number> = { [-1]: 250, 0: NORMAL_TON, 1: 320 };

type Snap = -1 | 0 | 1;
type Result = { danger?: boolean; vol?: boolean; osm?: boolean; icf?: boolean; why?: boolean; water?: boolean; salt?: boolean; role?: boolean; chain?: boolean };

// Fixed shuffle per case so the chain never starts in order.
function shuffled(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let x = seed * 9301 + 49297;
  for (let i = n - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.every((v, i) => v === i) ? a.reverse() : a;
}

const f0 = (n: number) => Math.round(n).toString();
const f1 = (n: number) => n.toFixed(1);
const dirOf = (d: number, eps: number): Snap => (d > eps ? 1 : d < -eps ? -1 : 0);

// ---------- Diagram ----------
type Line = { v: number; text: string; kind: 'pred' | 'truth' | 'wrong' };
type DiagramProps = {
  ecf: number | null; icf: number;
  ton: number | null;               // ICF height (and ECF height unless ecfTon is given)
  ecfTon?: number | null;           // ECF height when it differs from the cells (before water moves)
  showOsm?: boolean;                // label each compartment's osmolality
  lines?: Line[];                   // tonicity lines: the student's prediction, the lab value, a wrong guess
  ghost?: { ecf: number; icf: number; ton: number } | null;   // before-treatment outline
  preEcf?: { ecf: number; ton: number } | null;              // dotted ECF outline before water moved
  arrow?: Snap | null;              // water across the membrane: 1 into cells, -1 out, 0 no shift
  arrowGuess?: boolean;             // arrow is the student's prediction
};

function Diagram({ ecf, icf, ton, ecfTon, showOsm, lines = [], ghost, preEcf, arrow, arrowGuess }: DiagramProps) {
  const W = 600, H = 320, PX = 9, left = 52, mem = left + 36 * PX, top = 24, bottom = 262, MAX = 380;
  const y = (o: number) => bottom - (Math.min(o, MAX) / MAX) * (bottom - top);
  const icfY = y(ton ?? NORMAL_TON);
  const ecfY = y(ecfTon ?? ton ?? NORMAL_TON);
  const box = (x: number, yy: number, w: number, h: number) =>
    ({ x, y: yy, width: w, height: h, style: { x, y: yy, width: w, height: h } as React.CSSProperties });
  const lowY = Math.max(icfY, ecfY);
  const ay = lowY + (bottom - lowY) * 0.42;
  const word = arrowGuess ? 'your prediction: ' : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dy-svg" role="img"
      aria-label={`ICF ${f1(icf)} liters at ${f0(ton ?? NORMAL_TON)}${ecf != null ? `, ECF ${f1(ecf)} liters at ${f0(ecfTon ?? ton ?? NORMAL_TON)}` : ''}`}>
      {[0, 100, 200, 300].map(t => (
        <g key={t}>
          <line x1={left} x2={W - 12} y1={y(t)} y2={y(t)} className="grid" />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
        </g>
      ))}
      <text x={14} y={(top + bottom) / 2} textAnchor="middle" className="tick" transform={`rotate(-90 14 ${(top + bottom) / 2})`}>Tonicity (mOsm/L)</text>

      <rect {...box(mem - icf * PX, icfY, icf * PX, bottom - icfY)} className="icf" />
      {ecf != null && <rect {...box(mem, ecfY, ecf * PX, bottom - ecfY)} className="ecf" />}

      {ghost && <>
        <rect x={mem - ghost.icf * PX} y={y(ghost.ton)} width={ghost.icf * PX} height={bottom - y(ghost.ton)} className="ghost" />
        <rect x={mem} y={y(ghost.ton)} width={ghost.ecf * PX} height={bottom - y(ghost.ton)} className="ghost" />
      </>}
      {preEcf && <>
        <rect x={mem} y={y(preEcf.ton)} width={preEcf.ecf * PX} height={bottom - y(preEcf.ton)} className="preoutline" />
        <text x={mem + preEcf.ecf * PX - 4} y={y(preEcf.ton) - 6} textAnchor="end" className="osmtext ecf-t">before water moved {f0(preEcf.ton)}</text>
      </>}

      <rect x={mem - BASE.icf * PX} y={y(NORMAL_TON)} width={BASE.icf * PX} height={bottom - y(NORMAL_TON)} className="normal" />
      <rect x={mem} y={y(NORMAL_TON)} width={BASE.ecf * PX} height={bottom - y(NORMAL_TON)} className="normal" />
      <line x1={left} x2={W - 12} y1={y(NORMAL_TON)} y2={y(NORMAL_TON)} className="ref" />
      <text x={W - 14} y={y(NORMAL_TON) - 6} textAnchor="end" className="reftext">normal 285</text>

      {lines.map(l => (
        <g key={l.kind}>
          <line x1={left} x2={W - 12} y1={y(l.v)} y2={y(l.v)} className={l.kind === 'truth' ? 'tonline' : 'wrongline'} />
          <text x={left + 6} y={y(l.v) + (l.kind === 'truth' ? 16 : -6)} className="predtext">{l.text}</text>
        </g>
      ))}

      {showOsm && ecf != null && <>
        <text x={mem - 8} y={icfY - 6} textAnchor="end" className="osmtext icf-t">cells {f0(ton ?? NORMAL_TON)}</text>
        <text x={mem + 8} y={ecfY - 6} className="osmtext ecf-t">ECF {f0(ecfTon ?? ton ?? NORMAL_TON)}</text>
      </>}

      <line x1={mem} x2={mem} y1={top - 8} y2={bottom} className="membrane" />
      <text x={mem} y={top - 12} textAnchor="middle" className="tick">cell membrane</text>

      {arrow === 1 && <g className={`arrow ${arrowGuess ? 'guess' : ''}`}>
        <line x1={mem + 56} x2={mem - 52} y1={ay} y2={ay} />
        <path d={`M ${mem - 64} ${ay} l 14 -8 v 16 z`} />
        <text x={mem} y={ay - 12} textAnchor="middle" className="arrowtext">{word}water in</text>
      </g>}
      {arrow === -1 && <g className={`arrow ${arrowGuess ? 'guess' : ''}`}>
        <line x1={mem - 56} x2={mem + 52} y1={ay} y2={ay} />
        <path d={`M ${mem + 64} ${ay} l -14 -8 v 16 z`} />
        <text x={mem} y={ay - 12} textAnchor="middle" className="arrowtext">{word}water out</text>
      </g>}
      {arrow === 0 && <text x={mem} y={ay} textAnchor="middle" className="arrowtext">{word}no water shift</text>}

      <text x={mem - (icf * PX) / 2} y={bottom - 14} textAnchor="middle" className="lab icf-t">ICF</text>
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

// Plain-language background on each condition (MedlinePlus, US National Library of Medicine)
const LEARN: Record<string, { text: string; url: string }> = {
  diarrhea: { text: 'Dehydration', url: 'https://medlineplus.gov/ency/article/000982.htm' },
  marathon: { text: 'Low blood sodium', url: 'https://medlineplus.gov/ency/article/000394.htm' },
  siadh: { text: 'SIADH', url: 'https://medlineplus.gov/ency/article/000314.htm' },
  hf: { text: 'Heart failure', url: 'https://medlineplus.gov/heartfailure.html' },
  addison: { text: 'Acute adrenal crisis', url: 'https://medlineplus.gov/ency/article/000357.htm' },
  dehydration: { text: 'Dehydration', url: 'https://medlineplus.gov/ency/article/000982.htm' },
  di: { text: 'Nephrogenic diabetes insipidus', url: 'https://medlineplus.gov/ency/article/000511.htm' },
  hhs: { text: 'Hyperglycemic hyperosmolar syndrome', url: 'https://medlineplus.gov/ency/article/000304.htm' },
};

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

      <h3>The six steps</h3>
      <ol>
        <li><b>Danger.</b> Brain, circulation, both or neither? The brain reports on cell volume (tonicity); the circulation reports on the ECF.</li>
        <li><b>Wet or dry.</b> Orthostatics, JVP, edema, mucous membranes and weight tell you what the ECF is doing.</li>
        <li><b>Sodium.</b> Na⁺ and glucose set the tonicity line: above, at or below 285.</li>
        <li><b>Cells.</b> Water follows tonicity: in, out or no shift.</li>
        <li><b>Kidney.</b> Urine osmolality and urine Na⁺ show whether the kidney is holding or losing water and salt, and whether that response is homeostatic or part of the problem.</li>
        <li><b>Put the story together.</b> Order the causal chain, then read the debrief.</li>
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

      <h3>The cases</h3>
      <table className="reftable"><thead><tr><th>Case</th><th>What happened</th><th>Learn more</th></tr></thead><tbody>
        {CASES.map((k, i) => {
          const more = LEARN[k.id];
          return <tr key={k.id} className={k.optional ? 'optrow' : undefined}><td>{k.optional ? `Optional ${i - CORE + 1}` : i + 1}. {k.title}</td><td>{k.debrief.what}</td><td>{more && <a href={more.url} target="_blank" rel="noopener">{more.text}</a>}</td></tr>;
        })}
      </tbody></table>

      <h3>Teaching model</h3>
      <p>42 L total body water (ICF 28 L, ECF 14 L). Only Na⁺ salts and glucose are effective osmoles; ICF solute is fixed. Urine values are illustrative. This is a teaching tool, not a guide to treatment.</p>

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
  const [role, setRole] = useState<'homeostatic' | 'problem'>();
  const [dangerPick, setDangerPick] = useState<Danger>();
  const [kidneyChecked, setKidneyChecked] = useState(false);
  const [result, setResult] = useState<Result>({});
  const [flash, setFlash] = useState(0);
  const [history, setHistory] = useState<Record<string, Result>>({});
  const [showRef, setShowRef] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [why, setWhy] = useState<Snap>();             // reason for the cell prediction: 1 ECF lower, -1 ECF higher, 0 equal
  const [order, setOrder] = useState<number[]>([]);   // chain links in the order tapped
  const [chainChecked, setChainChecked] = useState(false);
  const [shift, setShift] = useState<'before' | 'after'>('after');   // cells step: before or after water moves
  const timer = useRef<number>();
  const playShift = () => {
    window.clearTimeout(timer.current);
    setShift('before');
    timer.current = window.setTimeout(() => setShift('after'), 2200);
  };
  const showShift = (v: 'before' | 'after') => { window.clearTimeout(timer.current); setShift(v); };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const c = CASES[ci];
  const truth = useMemo(() => run(c.events).final, [ci]);
  const L = labs(truth);
  const labNa = Math.round(L.na);
  const gluC = L.glucose / 18;
  const truthIcfDir = dirOf(truth.icf - BASE.icf, 0.1);
  // The instant the case's fluid has reached the ECF, before any water crosses the membrane.
  const pre = useMemo(() => {
    const sum = (k: 'water' | 'salt' | 'glu') => c.events.reduce((a, e) => a + (e[k] ?? 0), 0);
    const ecf = Math.max(0.5, BASE.ecf + sum('water'));
    return { ecf, ton: (BASE.salt + BASE.glu + sum('salt') + sum('glu')) / ecf };
  }, [ci]);
  const cellTon = BASE.icfEff / BASE.icf;

  const reset = (i: number) => {
    setCi(i); setStep(0); setMaxStep(0); setVol(undefined); setTonGuess(undefined); setTonChecked(false); setIcfGuess(undefined); setIcfChecked(false);
    setWater(undefined); setSalt(undefined); setRole(undefined); setKidneyChecked(false); setDangerPick(undefined); setResult({}); showShift('after'); setWhy(undefined); setOrder([]); setChainChecked(false);
  };

  const volOk = vol != null && (vol === c.volume || (c.volumeAlso ?? []).includes(vol));
  const truthTonDir = dirOf(L.effOsm - NORMAL_TON, 5);

  // What the diagram shows at each step
  // What the diagram shows at each step. The case's fluid lands in the ECF first (stage 2);
  // water then crosses the membrane until both sides match (stage 3).
  const stage2 = { ecf: pre.ecf, icf: BASE.icf, ton: cellTon, ecfTon: pre.ton };
  const final = { ecf: truth.ecf, icf: truth.icf, ton: L.effOsm };
  const naLine: Line = { v: L.effOsm, text: `Na⁺ line ${f0(L.effOsm)}: both sides settle here`, kind: 'truth' };
  let diag: React.ReactNode;
  if (step === 0 || (step === 1 && vol == null)) diag = <Diagram ecf={null} icf={BASE.icf} ton={null} />;
  // Volume first: until the sodium question is checked, the ECF changes width only.
  else if (step === 1 || (step === 2 && !tonChecked)) diag = <Diagram ecf={pre.ecf} icf={BASE.icf} ton={cellTon}
    lines={step === 2 && tonGuess != null ? [{ v: TON_SNAPS[tonGuess], text: 'your line', kind: 'pred' }] : []} />;
  else if (step === 2) diag = <Diagram {...stage2} showOsm={tonChecked}
    lines={!tonChecked ? (tonGuess != null ? [{ v: TON_SNAPS[tonGuess], text: 'your line', kind: 'pred' }] : [])
      : [naLine, ...(tonGuess != null && tonGuess !== truthTonDir ? [{ v: TON_SNAPS[tonGuess], text: 'your prediction', kind: 'wrong' } as Line] : [])]} />;
  else if (step === 3 && (!icfChecked || shift === 'before'))
    diag = <Diagram {...stage2} showOsm lines={[naLine]} arrow={icfChecked ? truthIcfDir : icfGuess ?? null} arrowGuess={!icfChecked} />;
  else if (step === 3) diag = <Diagram {...final} arrow={truthIcfDir} preEcf={truthIcfDir !== 0 ? pre : null} />;
  else diag = <Diagram {...final} />;

  const shiftControls = (first: string, before: React.ReactNode, after: React.ReactNode) => (
    <div className="shiftbox">
      <div className="choices" role="group" aria-label="Water shift">
        <button aria-pressed={shift === 'before'} onClick={() => showShift('before')}>{first}</button>
        <button aria-pressed={shift === 'after'} onClick={() => showShift('after')}>2 · Water moves</button>
        <button className="linkbtn" onClick={playShift}>Replay</button>
      </div>
      <p className="hint">{shift === 'before' ? before : after}</p>
    </div>
  );

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
    if (n === 3) { setIcfGuess(undefined); setWhy(undefined); setIcfChecked(false); showShift('after'); }
    if (n === 0) setDangerPick(undefined);
    if (n === 4) { setWater(undefined); setSalt(undefined); setRole(undefined); setKidneyChecked(false); }
  };
  const resetBtn = (n: number) => (
    <button className="linkbtn" onClick={() => redo(n)} title="Clear your answer to this step and try again. Your first answer is still the one scored.">Reset this step</button>
  );
  const answered = [dangerPick != null, vol != null, tonChecked, icfChecked, kidneyChecked, chainChecked][step] ?? false;

  const scoreOf = (r: Result) => {
    const keys: (keyof Result)[] = ['danger', 'vol', 'osm', 'icf', 'why', 'water', 'salt', 'role', 'chain'];
    const pts = keys.filter(k => r[k] === true).length;
    return { pts, of: keys.length };
  };

  return (
    <div className="dy">
      <header className="top">
        <div>
          <div className="eyebrow">Body fluids at the bedside</div>
          <h1>Darrow–Yannet at the Bedside</h1>
        </div>
        <label className="casepick">
          <span>Case</span>
          <select id="case-select" value={ci} onChange={e => reset(Number(e.target.value))}>
            {CASES.map((k, i) => !k.optional && <option key={k.id} value={i}>{i + 1}. {k.title}</option>)}
            {c.optional && <option value={ci} disabled>Extra: {c.title}</option>}
          </select>
        </label>
        <div className="extrapick">
          <button className="linkbtn" aria-expanded={showExtra} onClick={() => setShowExtra(x => !x)}>Extra practice (optional)</button>
          {showExtra && <div className="extramenu">
            <p className="hint">Not yet reviewed by clinicians. About 5 min each.</p>
            {CASES.map((k, i) => k.optional && <button key={k.id} className="ghostbtn small" onClick={() => { setShowExtra(false); setShowRef(false); reset(i); }}>{k.title}</button>)}
          </div>}
        </div>
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
            <div className={c.optional ? 'eyebrow opt' : 'eyebrow'}>{caseLabel(ci)}</div>
            <h2>{c.title}</h2>
            <p>{c.story}</p>
          </div>

          <dl className="chart" aria-label="Patient chart">
            <div><dt>Vitals</dt><dd><span>{c.danger.circulation}</span><span>{c.danger.brain}</span></dd></div>
            {maxStep >= 1 && <div><dt>Exam</dt><dd>
              {c.exam.map(x => <span key={x}>{x}</span>)}
              {vol != null && <span className="you">You: {vol}</span>}
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
            </dd></div>}
          </dl>

          <div className="stepnav">
            {step > 0 && <button className="linkbtn" onClick={() => setStep(step - 1)}>← Back</button>}
            <span className="spacer" />
            {maxStep > 0 && <button className="linkbtn" onClick={() => reset(ci)}>Restart case</button>}
          </div>
          {step <= 5 && answered && maxStep > step && <p className="hint">Reviewing an earlier step. Only your first answer is scored.</p>}

          {step === 0 && (
            <div className="stepbox">
              <h3>1 · Is anyone in danger?</h3>
              <p className="lead">Before any numbers, ask the two questions that matter.</p>
              <div className="danger">
                <div><span className="k">Brain</span><span>{c.danger.brain}</span></div>
                <div><span className="k">Circulation</span><span>{c.danger.circulation}</span></div>
              </div>
              <p className="hint">The brain tells you about cell volume (tonicity). The circulation tells you about the ECF.</p>
              <p className="q">What is in danger?</p>
              <Choice label="Danger" value={dangerPick} disabled={dangerPick != null}
                options={[{ v: 'brain' as Danger, text: 'Brain' }, { v: 'circulation' as Danger, text: 'Circulation' }, { v: 'both' as Danger, text: 'Both' }, { v: 'neither' as Danger, text: 'Neither' }]}
                onPick={v => { setDangerPick(v); record({ danger: v === c.dangerKey || (c.dangerAlso ?? []).includes(v) }); }} />
              {dangerPick != null && <>
                <Verdict ok={dangerPick === c.dangerKey || (c.dangerAlso ?? []).includes(dangerPick)}>{c.dangerNote}</Verdict>
                <div className="row"><button className="primary" onClick={() => go(1)}>Examine the patient</button>{resetBtn(0)}</div>
              </>}
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
                <p className="hint">The fluid change lands in the ECF first. The green block shows its volume before any water crosses into or out of cells (dashed = normal, 14 L). Its height comes next, from the sodium.</p>
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
              <p className="lead">The diagram shows the moment the fluid reached the ECF, before any water crossed. Water moves toward the higher osmolality. Predict under the diagram.</p>
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
              <details className="hintbox">
                <summary>Hint: the kidney's vote</summary>
                <table className="reftable"><tbody>
                  <tr><td>U<sub>osm</sub> &gt; 100</td><td>Holding water (ADH on)</td></tr>
                  <tr><td>U<sub>osm</sub> &lt; 100</td><td>Dumping water (ADH off)</td></tr>
                  <tr><td>U<sub>Na</sub> &lt; 20</td><td>Holding salt: the kidney senses low perfusion</td></tr>
                  <tr><td>U<sub>Na</sub> &gt; 20</td><td>Losing salt, or perfusion is fine</td></tr>
                </tbody></table>
                <p className="hint">For comparison, plasma is about 285 mOsm/L and serum Na⁺ 135–145. Urine has no fixed normal; read it against what the body needs. Perfusion beats tonicity: low effective volume turns ADH on even when Na⁺ is low.</p>
              </details>
              <p className="q">Water</p>
              <Choice label="Water" value={water} disabled={kidneyChecked}
                options={[{ v: 'holding' as const, text: 'Holding water' }, { v: 'dumping' as const, text: 'Dumping water' }]} onPick={setWater} />
              <p className="q">Salt</p>
              <Choice label="Salt" value={salt} disabled={kidneyChecked}
                options={[{ v: 'holding' as const, text: 'Holding salt' }, { v: 'losing' as const, text: 'Losing salt' }]} onPick={setSalt} />
              <p className="q">Is the kidney's response homeostatic, or part of the problem?</p>
              <Choice label="Kidney's role" value={role} disabled={kidneyChecked}
                options={[{ v: 'homeostatic' as const, text: 'Homeostatic: responding to what it senses' }, { v: 'problem' as const, text: 'Part of the problem' }]} onPick={setRole} />
              {!kidneyChecked && <button className="primary" disabled={water == null || salt == null || role == null}
                onClick={() => { setKidneyChecked(true); record({ water: water === c.water, salt: salt === c.salt, role: role === c.kidneyRole }); }}>Check</button>}
              {kidneyChecked && <>
                <Verdict ok={water === c.water && salt === c.salt ? true : water === c.water || salt === c.salt ? 'ok' : false}>{c.kidneyNote}</Verdict>
                <Verdict ok={role === c.kidneyRole}>{c.roleNote}</Verdict>
                <div className="row"><button className="primary" onClick={() => go(5)}>Put the story together</button>{resetBtn(4)}</div>
              </>}
            </div>
          )}

          {step === 5 && (() => {
            const s = scoreOf(result);
            const done = Object.keys({ ...history, [c.id]: result }).filter(id => CASES.some(k => k.id === id && !k.optional)).length;
            return (
              <div className="stepbox">
                <h3>6 · Put the story together</h3>
                <div className="chainbox">
                  <p className="q">Put the story in order: tap the links from first cause to what you see at the bedside.</p>
                  <ol className="chainlist">
                    {c.chain.map((_, i) => {
                      const k = order[i];
                      const right = chainChecked && k === i;
                      return <li key={i} className={chainChecked ? (right ? 'right' : 'wrong') : k == null ? 'empty' : ''}>
                        {k == null ? '\u00a0' : c.chain[k]}
                        {chainChecked && !right && <span className="should">should be: {c.chain[i]}</span>}
                      </li>;
                    })}
                  </ol>
                  {!chainChecked && <div className="choices chainpool" role="group" aria-label="Links">
                    {shuffled(c.chain.length, ci + 3).map(k => (
                      <button key={k} disabled={order.includes(k)} onClick={() => setOrder(o => [...o, k])}>{c.chain[k]}</button>
                    ))}
                  </div>}
                  {!chainChecked && <div className="row">
                    <button className="primary" disabled={order.length < c.chain.length}
                      onClick={() => {
                        const ok = order.every((k, i) => k === i);
                        setChainChecked(true); record({ chain: ok });
                        setHistory(h => ({ ...h, [c.id]: { ...result, chain: result.chain ?? ok } }));
                      }}>Check</button>
                    <button className="linkbtn" disabled={!order.length} onClick={() => setOrder(o => o.slice(0, -1))}>Undo</button>
                    <button className="linkbtn" disabled={!order.length} onClick={() => setOrder([])}>Clear</button>
                  </div>}
                  {chainChecked && <Verdict ok={order.every((k, i) => k === i)}>{order.every((k, i) => k === i)
                    ? 'Each link causes the next.' : 'Read the corrected chain: each link causes the next.'}</Verdict>}
                </div>
                {chainChecked && <>
                <div className="debrief">
                  <h3>Debrief: {c.title}</h3>
                  <dl>
                    <div><dt>Who</dt><dd>{c.debrief.who}</dd></div>
                    <div><dt>What happened</dt><dd>{c.debrief.what}</dd></div>
                    <div><dt>Key findings</dt><dd>{c.debrief.findings}</dd></div>
                    <div><dt>Danger</dt><dd>{c.debrief.danger}</dd></div>
                  </dl>
                  {LEARN[c.id] && <p className="hint">Learn more: <a href={LEARN[c.id].url} target="_blank" rel="noopener">{LEARN[c.id].text}</a> (MedlinePlus)</p>}
                </div>
                <div className="scorebig mono">{s.pts} / {s.of}</div>
                <ul className="tally">
                  <li className={result.danger ? 'y' : 'n'}>Danger</li>
                  <li className={result.vol ? 'y' : 'n'}>Wet or dry</li>
                  <li className={result.osm ? 'y' : 'n'}>Tonicity line</li>
                  <li className={result.icf ? 'y' : 'n'}>Cells</li>
                  <li className={result.why ? 'y' : 'n'}>Cells: reason</li>
                  <li className={result.water ? 'y' : 'n'}>Kidney: water</li>
                  <li className={result.salt ? 'y' : 'n'}>Kidney: salt</li>
                  <li className={result.role ? 'y' : 'n'}>Kidney: homeostatic or problem</li>
                  <li className={result.chain ? 'y' : result.chain === false ? 'n' : ''}>Causal chain</li>
                </ul>
                <p className="hint">{done} of {CORE} core cases done.</p>
                {ci === CORE - 1 && <div className="extras">
                  <p><b>End of the core cases.</b> Extra practice (optional, about 5 min each; not yet reviewed by clinicians):</p>
                  <div className="row">{CASES.map((k, i) => k.optional && <button key={k.id} className="ghostbtn small" onClick={() => reset(i)}>{k.title}</button>)}</div>
                </div>}
                <div className="row">
                  {ci < CORE - 1 && <button className="primary" onClick={() => reset(ci + 1)}>Next case</button>}
                  {ci >= CORE && ci < CASES.length - 1 && <button className="ghostbtn" onClick={() => reset(ci + 1)}>Next optional case</button>}
                  <a className="ghostbtn" href={CARD_URL}>Post-activity: Darrow–Yannet, read backward</a>
                </div>
                </>}
              </div>
            );
          })()}
        </section>

        <section className="figure" aria-label="Darrow–Yannet diagram">
          {flash > 0 && <div key={flash} className="flash" aria-hidden="true" />}
          <div className="diagwrap">
          {maxStep >= 2 && <div className="minilabs mono" aria-hidden="true">
            <span>Na⁺ {labNa}</span><span>Glu {f0(L.glucose)}</span>
            {(tonChecked || maxStep > 2) && <span>Ton {f0(L.effOsm)}</span>}
            <span>Hct {f0(L.hct)}%</span>
            {maxStep >= 4 && <><span>U<sub>osm</sub> {c.urine.osm}</span><span>U<sub>Na</sub> {c.urine.na}</span></>}
          </div>}
          {diag}
          <div className="legend">
            <span><i className="sw icf" />ICF (cells)</span>
            <span><i className="sw ecf" />ECF</span>
            <span><i className="sw normal" />normal</span>
          </div>
          </div>

          {step === 2 && (
            <div className="predict">
              <p className="q">Using Na⁺ and glucose from the Labs row: where will both sides settle?</p>
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
                  : <>Na⁺ {labNa} puts tonicity {truthTonDir > 0 ? 'above' : truthTonDir < 0 ? 'below' : 'at'} normal. The blue line is where both sides will settle once water moves.</>}</Verdict>
                <div className="row"><button className="primary" onClick={() => go(3)}>Predict the cells</button>{resetBtn(2)}</div>
              </>}
            </div>
          )}

          {step === 3 && (
            <div className="predict">
              <p className="q">ECF {f0(pre.ton)}, cells {f0(cellTon)}. Which way will water move?</p>
              <Choice label="Cells" value={icfGuess} disabled={icfChecked}
                options={[{ v: -1 as Snap, text: 'Water out · cells shrink' }, { v: 0 as Snap, text: 'No shift' }, { v: 1 as Snap, text: 'Water in · cells swell' }]}
                onPick={pickIcf} />
              <p className="q">Why?</p>
              <Choice label="Reason" value={why} disabled={icfChecked}
                options={[{ v: 1 as Snap, text: 'The ECF is lower than the cells' }, { v: -1 as Snap, text: 'The ECF is higher than the cells' }, { v: 0 as Snap, text: 'No gradient: both sides are equal' }]}
                onPick={setWhy} />
              {!icfChecked && <>
                <p className="hint">{icfGuess == null ? 'Pick one. Your prediction is drawn as an arrow.' : 'Your prediction is drawn as an arrow.'}</p>
                <button className="primary" disabled={icfGuess == null || why == null}
                  onClick={() => { setIcfChecked(true); record({ icf: icfGuess === truthIcfDir, why: why === truthIcfDir }); showShift('after'); }}>Check</button>
              </>}
              {icfChecked && <>
                <Verdict ok={icfGuess === truthIcfDir}>{c.icfNote} ICF {f1(truth.icf)} L (normal 28).</Verdict>
                <Verdict ok={why === truthIcfDir}>{truthIcfDir === 0
                  ? <>Reason: ECF and cells were both {f0(pre.ton)}. Without a gradient, water has no reason to move.</>
                  : <>Reason: the ECF ({f0(pre.ton)}) was {truthIcfDir > 0 ? 'lower' : 'higher'} than the cells ({f0(cellTon)}). Water moves toward the higher osmolality.</>}</Verdict>
                {shiftControls('1 · Fluid reaches the ECF',
                  truthIcfDir === 0 ? <>The fluid reached the ECF at {f0(pre.ton)}, the same as the cells. No gradient, so no water moves.</>
                    : <>The fluid reached the ECF first: ECF {f0(pre.ton)}, cells {f0(cellTon)}. Water moves toward the higher osmolality: {truthIcfDir > 0 ? 'into the cells' : 'out of the cells'}.</>,
                  truthIcfDir === 0 ? <>Nothing to equalize: both sides stay at {f0(L.effOsm)}.</>
                    : <>Water moved until both sides reached the Na⁺ line, {f0(L.effOsm)}. Cells {truthIcfDir > 0 ? 'swelled' : 'shrank'} to {f1(truth.icf)} L; ECF ended at {f1(truth.ecf)} L (dotted = before water moved).</>)}
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
