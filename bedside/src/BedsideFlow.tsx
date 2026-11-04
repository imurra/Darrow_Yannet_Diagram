/*
 * Darrow–Yannett at the Bedside
 * Copyright (c) 2026 Ian Victor Joseph Murray · CC BY-NC-SA 4.0
 * http://creativecommons.org/licenses/by-nc-sa/4.0/
 */
import React, { useMemo, useRef, useState } from 'react';
import { BASE, labs, run, treat, State } from './engine';
import { CASES, FLUIDS, FluidId, Need, Vol } from './cases';

const CARD_URL = 'https://claude.ai/artifact/8mQxNPryeMczu5kGyH91Ti';
const STEPS = ['Danger', 'Wet or dry', 'Sodium', 'Cells', 'Kidney', 'Treatment'];
const NORMAL_TON = 285;
const ICF_SNAPS: Record<-1 | 0 | 1, number> = { [-1]: 23, 0: 28, 1: 33 };

type Snap = -1 | 0 | 1;
type Result = { vol?: boolean; icf?: boolean; water?: boolean; salt?: boolean; cause?: boolean; ecfNeed?: boolean; cellNeed?: boolean; fluid?: 'best' | 'ok' | 'harmful' };

const f0 = (n: number) => Math.round(n).toString();
const f1 = (n: number) => n.toFixed(1);
const dirOf = (d: number, eps: number): Snap => (d > eps ? 1 : d < -eps ? -1 : 0);

// ---------- Diagram ----------
type DiagramProps = {
  ecf: number | null; icf: number; ton: number | null;
  ghost?: { ecf: number; icf: number; ton: number } | null;
  icfDraggable?: boolean; onIcfSnap?: (s: Snap) => void; icfLabel?: string;
};

function Diagram({ ecf, icf, ton, ghost, icfDraggable, onIcfSnap, icfLabel }: DiagramProps) {
  const W = 600, H = 320, PX = 9, left = 52, mem = left + 36 * PX, top = 24, bottom = 262, MAX = 380;
  const y = (o: number) => bottom - (Math.min(o, MAX) / MAX) * (bottom - top);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const tonY = y(ton ?? NORMAL_TON);

  const snapFromEvent = (e: React.PointerEvent) => {
    const svg = svgRef.current; if (!svg || !onIcfSnap) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const liters = (mem - p.x) / PX;
    const best = ([-1, 0, 1] as Snap[]).reduce((a, b) => (Math.abs(ICF_SNAPS[b] - liters) < Math.abs(ICF_SNAPS[a] - liters) ? b : a));
    onIcfSnap(best);
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="dy-svg" role="img"
      aria-label={`ICF ${f1(icf)} liters${ecf != null ? `, ECF ${f1(ecf)} liters` : ''}${ton != null ? `, tonicity ${f0(ton)}` : ''}`}
      onPointerMove={e => { if (dragging.current) snapFromEvent(e); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerLeave={() => { dragging.current = false; }}>
      {[0, 100, 200, 300].map(t => (
        <g key={t}>
          <line x1={left} x2={W - 12} y1={y(t)} y2={y(t)} className="grid" />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
        </g>
      ))}
      <text x={14} y={(top + bottom) / 2} textAnchor="middle" className="tick" transform={`rotate(-90 14 ${(top + bottom) / 2})`}>Tonicity (mOsm/L)</text>

      {/* compartments */}
      <rect x={mem - icf * PX} y={tonY} width={icf * PX} height={bottom - tonY} className={`icf ${icfDraggable ? 'guess' : ''}`} />
      {ecf != null && <rect x={mem} y={tonY} width={ecf * PX} height={bottom - tonY} className="ecf" />}

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

      <line x1={mem} x2={mem} y1={top - 8} y2={bottom} className="membrane" />
      <text x={mem} y={top - 12} textAnchor="middle" className="tick">cell membrane</text>

      <text x={mem - (icf * PX) / 2} y={bottom - 14} textAnchor="middle" className="lab icf-t">{icfLabel ?? 'ICF'}</text>
      {ecf != null && <text x={mem + (ecf * PX) / 2} y={bottom - 14} textAnchor="middle" className="lab ecf-t">ECF</text>}
      {ecf == null && <text x={mem + 63} y={(top + bottom) / 2 + 30} textAnchor="middle" className="tick">ECF: examine first</text>}

      {icfDraggable && (
        <rect x={mem - icf * PX - 9} y={tonY + (bottom - tonY) / 2 - 26} width={18} height={52} rx={6} className="handle"
          onPointerDown={e => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); snapFromEvent(e); }} />
      )}

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

// ---------- App ----------
export default function BedsideFlow() {
  const [ci, setCi] = useState(0);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [vol, setVol] = useState<Vol>();
  const [na, setNa] = useState(140);
  const [icfGuess, setIcfGuess] = useState<Snap>(0);
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
  const [history, setHistory] = useState<Record<string, Result>>({});

  const c = CASES[ci];
  const truth = useMemo(() => run(c.events).final, [ci]);
  const L = labs(truth);
  const labNa = Math.round(L.na);
  const gluC = L.glucose / 18;
  const truthIcfDir = dirOf(truth.icf - BASE.icf, 0.1);

  const treated: State | null = fluid ? treat(truth, FLUIDS[fluid].event, c.adhUosm) : null;
  const TL = treated ? labs(treated) : null;

  const reset = (i: number) => {
    setCi(i); setStep(0); setMaxStep(0); setVol(undefined); setNa(140); setIcfGuess(0); setIcfChecked(false);
    setWater(undefined); setSalt(undefined); setCause(undefined); setKidneyChecked(false);
    setNeedEcf(undefined); setNeedCells(undefined); setNeedChecked(false); setFluid(undefined); setResult({});
  };

  const volOk = vol != null && (vol === c.volume || (c.volumeAlso ?? []).includes(vol));
  const naMatched = Math.abs(na - labNa) <= 1;

  // What the diagram shows at each step
  const showEcf = step >= 1 && vol != null ? truth.ecf : null;
  const ton = step >= 2 ? 2 * na + gluC : null;
  const icfShown = step < 3 ? BASE.icf : icfChecked || step > 3 ? truth.icf : ICF_SNAPS[icfGuess];
  const diag = step === 5 && treated && TL
    ? <Diagram ecf={treated.ecf} icf={treated.icf} ton={TL.effOsm} ghost={{ ecf: truth.ecf, icf: truth.icf, ton: L.effOsm }} />
    : <Diagram ecf={showEcf} icf={icfShown} ton={ton}
        icfDraggable={step === 3 && !icfChecked} onIcfSnap={setIcfGuess}
        icfLabel={step === 3 && !icfChecked ? 'ICF: drag the edge' : 'ICF'} />;

  // Only the first answer to each question is scored; Redo and Back never change it.
  const record = (r: Result) => setResult(prev => {
    const next: Result = { ...prev };
    (Object.keys(r) as (keyof Result)[]).forEach(k => { if (next[k] === undefined) (next as any)[k] = r[k]; });
    return next;
  });
  const go = (n: number) => { setStep(n); setMaxStep(m => Math.max(m, n)); };
  const redo = (n: number) => {
    if (n === 1) setVol(undefined);
    if (n === 2) setNa(140);
    if (n === 3) { setIcfGuess(0); setIcfChecked(false); }
    if (n === 4) { setWater(undefined); setSalt(undefined); setCause(undefined); setKidneyChecked(false); }
    if (n === 5) { setNeedEcf(undefined); setNeedCells(undefined); setNeedChecked(false); setFluid(undefined); }
  };
  const answered = [true, vol != null, naMatched, icfChecked, kidneyChecked, needChecked][step] ?? false;
  const finish = () => { setHistory(h => ({ ...h, [c.id]: result })); go(6); };

  const scoreOf = (r: Result) => {
    const keys: (keyof Result)[] = ['vol', 'icf', 'water', 'salt', 'cause', 'ecfNeed', 'cellNeed'];
    const pts = keys.filter(k => r[k] === true).length + (r.fluid === 'best' ? 1 : r.fluid === 'ok' ? 0.5 : 0);
    return { pts, of: 8 };
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
          <li key={s} className={i === step ? 'now' : i <= maxStep ? 'done' : ''}>
            {i <= maxStep
              ? <button onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}><span>{i + 1}</span>{s}</button>
              : <div><span>{i + 1}</span>{s}</div>}
          </li>
        ))}
      </ol>

      <div className="layout">
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
              {(naMatched || maxStep > 2) && <span className="v">Tonicity {f0(L.effOsm)}</span>}
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
            {step >= 1 && step <= 5 && answered && <button className="linkbtn" onClick={() => redo(step)}>Redo this step</button>}
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
                <button className="primary" onClick={() => go(2)}>Check the sodium</button>
              </>}
            </div>
          )}

          {step === 2 && (
            <div className="stepbox">
              <h3>3 · Let sodium set the line</h3>
              <div className="labs">
                <div><span>Serum Na⁺</span><b>{labNa}</b></div>
                <div><span>Glucose</span><b>{f0(L.glucose)} mg/dL</b></div>
              </div>
              <label className={`slider ${naMatched ? 'matched' : 'needs'}`} htmlFor="na-slider">
                <span>Move the slider to the patient's Na⁺. Normal is 140.</span>
                <input id="na-slider" type="range" min={110} max={170} value={na} disabled={naMatched && maxStep > 2} onChange={e => setNa(Number(e.target.value))} />
                <span className="scale"><span>110</span><span>140</span><span>170</span></span>
                <span className="status" aria-live="polite">
                  {naMatched
                    ? <>✓ Slider at <b className="mono">{na}</b>: matches the lab.{labNa === 140 ? ' Normal sodium, so the line stays at normal.' : ''}</>
                    : <>Slider at <b className="mono">{na}</b>. Move it {na < labNa ? 'right' : 'left'} to <b className="mono">{labNa}</b>.</>}
                </span>
              </label>
              <div className="formula mono">tonicity ≈ 2 × Na⁺ + glucose/18 = {f0(2 * na)} + {f0(gluC)} = <b>{f0(2 * na + gluC)}</b></div>
              {naMatched && (L.glucose > 300
                ? <Verdict ok={true}>Look at the line: Na⁺ is low, but glucose pushes tonicity <b>above</b> normal. Sodium alone would have fooled you.</Verdict>
                : <Verdict ok={true}>Tonicity is {L.effOsm > NORMAL_TON + 3 ? 'above' : L.effOsm < NORMAL_TON - 3 ? 'below' : 'at'} normal. The line now sits where this patient's water is.</Verdict>)}
              <button className="primary" disabled={!naMatched} onClick={() => go(3)}>Predict the cells</button>
            </div>
          )}

          {step === 3 && (
            <div className="stepbox">
              <h3>4 · What did the cells do?</h3>
              <p className="lead">Drag the left edge of the ICF block, or pick below. Water follows tonicity.</p>
              <Choice label="ICF volume" value={icfGuess} disabled={icfChecked}
                options={[{ v: -1 as Snap, text: 'Shrank' }, { v: 0 as Snap, text: 'Unchanged' }, { v: 1 as Snap, text: 'Swelled' }]}
                onPick={setIcfGuess} />
              {!icfChecked && <button className="primary" onClick={() => { setIcfChecked(true); record({ icf: icfGuess === truthIcfDir }); }}>Check</button>}
              {icfChecked && <>
                <Verdict ok={icfGuess === truthIcfDir}>{c.icfNote} ICF {f1(truth.icf)} L (normal 28).</Verdict>
                <button className="primary" onClick={() => go(4)}>Ask the kidney</button>
              </>}
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
                <button className="primary" onClick={() => go(5)}>Treat</button>
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
                <p className="q">Now pick what to give. Watch where it goes.</p>
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
                  <p className="hint">Outline = before treatment. Try other options to compare; only your first choice is scored.</p>
                  <button className="primary" onClick={finish}>Finish case</button>
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
                  <a className="ghostbtn" href={CARD_URL} target="_blank" rel="noopener">Post-activity: Darrow–Yannett, read backward</a>
                </div>
              </div>
            );
          })()}
        </section>

        <section className="figure" aria-label="Darrow–Yannett diagram">
          {diag}
          <div className="legend">
            <span><i className="sw icf" />ICF (cells)</span>
            <span><i className="sw ecf" />ECF</span>
            <span><i className="sw normal" />normal</span>
            {treated && <span><i className="sw ghost" />before treatment</span>}
          </div>
        </section>
      </div>

      <footer>© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0 · Teaching model: 42 L body water, effective osmoles only; urine values are illustrative.</footer>
    </div>
  );
}
