/*
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
 * Copyright (c) 2024 Ian Victor Joseph Murray imurra@yahoo.com
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
 *
 * Attribution to Ian Murray required. Non-commercial, educational use. Share alike.
 * Provided "as is" without warranty. Full terms: http://creativecommons.org/licenses/by-nc-sa/4.0/legalcode
 */

import React, { useState } from 'react';

type Tonicity = 'isotonic' | 'hypotonic' | 'hypertonic';
type Stage = 'before' | 'after';

// Baseline: 42 L total body water, 1/3 ECF, 2/3 ICF, 290 mOsm/L everywhere.
const BASE_ECF = 14;
const BASE_ICF = 28;
const BASE_OSM = 290;

// Osmolarity of the fluid gained or lost (mOsm/L).
const FLUID_OSM: Record<Tonicity, number> = { isotonic: 290, hypotonic: 0, hypertonic: 600 };
const FLUID_NOTE: Record<Tonicity, string> = {
  isotonic: 'Same concentration as plasma (290 mOsm/L)',
  hypotonic: 'Pure water (0 mOsm/L)',
  hypertonic: 'More concentrated than plasma (600 mOsm/L)',
};
const EXAMPLES: Record<string, string> = {
  'isotonic-gain': 'Isotonic saline (0.9% NaCl) infusion',
  'isotonic-loss': 'Diarrhea, hemorrhage',
  'hypotonic-gain': 'SIADH, excessive water drinking',
  'hypotonic-loss': 'Sweating, dehydration, diabetes insipidus',
  'hypertonic-gain': 'Hypertonic saline infusion, high NaCl intake',
  'hypertonic-loss': 'Adrenal insufficiency (NaCl loss)',
};

/**
 * Mass balance. Fluid enters or leaves via the ECF; ICF solute is fixed (cells keep their solute).
 * "before" = right after the ECF change, before water crosses cell membranes.
 * "after"  = new steady state, where ECF and ICF osmolarity are equal again.
 */
export function solve(tonicity: Tonicity, liters: number) {
  const ecfSolute = BASE_ECF * BASE_OSM + FLUID_OSM[tonicity] * liters;
  const icfSolute = BASE_ICF * BASE_OSM;
  const ecfBefore = BASE_ECF + liters;
  const osmBefore = ecfSolute / ecfBefore;
  const total = BASE_ECF + BASE_ICF + liters;
  const osmAfter = (ecfSolute + icfSolute) / total;
  const icfAfter = icfSolute / osmAfter;
  const ecfAfter = total - icfAfter;
  return { ecfBefore, osmBefore, osmAfter, icfAfter, ecfAfter };
}

const trend = (delta: number, eps: number) => (delta > eps ? 1 : delta < -eps ? -1 : 0);
const f1 = (n: number) => n.toFixed(1);
const f0 = (n: number) => Math.round(n).toString();

const STYLES = `
.dy { --bg:#fbfaf8; --panel:#ffffff; --ink:#1e2430; --muted:#5d6675; --line:#d9dce2;
  --icf:#f2a7b0; --icf-ink:#9b2f3d; --ecf:#9fdcae; --ecf-ink:#24703a; --osm:#c8312b; --accent:#2f5d9e;
  --up:#24703a; --down:#9b2f3d;
  --font-body: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
  --font-head: "Fraunces", Georgia, serif;
  --font-num: "JetBrains Mono", ui-monospace, Menlo, monospace;
  background:var(--bg); color:var(--ink); font-family:var(--font-body); font-size:15px; line-height:1.5;
  max-width:980px; margin:0 auto; padding-block:20px 28px;
  padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dy {
  --bg:#14171c; --panel:#1c2027; --ink:#e7e9ee; --muted:#a2a9b5; --line:#343a45;
  --icf:#b8606d; --icf-ink:#ffb9c2; --ecf:#4f9a64; --ecf-ink:#a8eebb; --osm:#ff6b61; --accent:#8fb4ee;
  --up:#a8eebb; --down:#ffb9c2; } }
:root[data-theme="dark"] .dy {
  --bg:#14171c; --panel:#1c2027; --ink:#e7e9ee; --muted:#a2a9b5; --line:#343a45;
  --icf:#b8606d; --icf-ink:#ffb9c2; --ecf:#4f9a64; --ecf-ink:#a8eebb; --osm:#ff6b61; --accent:#8fb4ee;
  --up:#a8eebb; --down:#ffb9c2; }
.dy h1 { font-family:var(--font-head); font-weight:600; font-size:1.7rem; line-height:1.15; margin:0 0 4px; text-wrap:balance; }
.dy h2 { font-size:.75rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin:0 0 8px; font-weight:600; }
.dy .sub { color:var(--muted); margin:0 0 18px; max-width:65ch; }
.dy .controls { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:18px; }
.dy .seg { display:flex; flex-wrap:wrap; gap:6px; }
.dy .seg button { font:inherit; padding:6px 12px; border:1px solid var(--line); background:var(--panel); color:var(--ink); border-radius:6px; cursor:pointer; }
.dy .seg button[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:var(--bg); }
.dy button:focus-visible, .dy input:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.dy .note { color:var(--muted); font-size:.85rem; margin-top:6px; }
.dy input[type=range] { width:100%; accent-color:var(--accent); }
.dy .scale { display:flex; justify-content:space-between; font-size:.8rem; color:var(--muted); font-family:var(--font-num); }
.dy .vol { font-family:var(--font-num); font-variant-numeric:tabular-nums; font-weight:600; }
.dy .stage { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:8px; }
.dy .main { display:grid; grid-template-columns:minmax(0,1fr); max-width:720px; }
.dy .figure { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; min-width:0; }
.dy svg { display:block; width:100%; height:auto; }
.dy svg text { fill:var(--muted); font-family:var(--font-num); font-size:13px; }
.dy .readout { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:10px; font-variant-numeric:tabular-nums; }
.dy .readout div { font-size:.8rem; color:var(--muted); }
.dy .readout b { display:block; font-family:var(--font-num); font-size:1rem; color:var(--ink); }
.dy .verdict { margin:18px 0 10px; display:flex; flex-wrap:wrap; gap:8px 14px; align-items:baseline; }
.dy .chip { font-weight:700; font-size:1.05rem; }
.dy .eg { color:var(--muted); }
.dy ol.steps { list-style:none; padding:0; margin:0; display:grid; gap:10px; }
.dy ol.steps li { display:grid; grid-template-columns:2rem minmax(0,1fr); gap:10px; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; }
.dy .num { font-family:var(--font-head); font-size:1.4rem; font-weight:600; color:var(--accent); line-height:1; }
.dy .q { font-weight:700; }
.dy .rule { color:var(--muted); margin:2px 0 6px; }
.dy .ans { font-weight:600; }
.dy .up { color:var(--up); } .dy .down { color:var(--down); }
.dy footer { margin-top:20px; font-size:.75rem; color:var(--muted); }
@media (max-width:640px) { .dy .controls { grid-template-columns:1fr; } .dy .readout { grid-template-columns:repeat(2,1fr); } }
`;

const DarrowYannettDiagram = () => {
  const [tonicity, setTonicity] = useState<Tonicity>('hypotonic');
  const [liters, setLiters] = useState(-3);
  const [stage, setStage] = useState<Stage>('after');

  const s = solve(tonicity, liters);
  const gain = liters > 0;
  const none = liters === 0;

  // What the diagram shows for the selected stage
  const icfVol = stage === 'before' ? BASE_ICF : s.icfAfter;
  const ecfVol = stage === 'before' ? s.ecfBefore : s.ecfAfter;
  const icfOsm = stage === 'before' ? BASE_OSM : s.osmAfter;
  const ecfOsm = stage === 'before' ? s.osmBefore : s.osmAfter;

  // ---- Darrow-Yannett plot geometry ----
  const W = 520, H = 300, PX = 7, MAX_OSM = 480;
  const left = 44, axisX = left + 36 * PX, top = 20, bottom = 250;
  const y = (osm: number) => bottom - (Math.min(osm, MAX_OSM) / MAX_OSM) * (bottom - top);
  const ticks = [0, 100, 200, 300, 400];

  // ---- step answers ----
  const ecfTrend = trend(liters, 0.01);
  const osmTrend = trend(s.osmBefore - BASE_OSM, 0.5);
  const icfTrend = trend(s.icfAfter - BASE_ICF, 0.05);
  const finalOsmTrend = trend(s.osmAfter - BASE_OSM, 0.5);
  const arrow = (t: number) => (t > 0 ? '↑' : t < 0 ? '↓' : '—');
  const cls = (t: number) => (t > 0 ? 'up' : t < 0 ? 'down' : '');

  const osmWord = finalOsmTrend > 0 ? 'Hyperosmotic' : finalOsmTrend < 0 ? 'Hyposmotic' : 'Isosmotic';
  const volWord = s.ecfAfter > BASE_ECF + 0.05 ? 'volume expansion' : s.ecfAfter < BASE_ECF - 0.05 ? 'volume contraction' : 'no volume change';
  const example = none ? '' : EXAMPLES[`${tonicity}-${gain ? 'gain' : 'loss'}`];


  return (
    <div className="dy">
      <style>{STYLES}</style>
      <h1>Darrow–Yannett Diagram</h1>
      <p className="sub">
        Add or remove fluid from the body and watch where the water goes. Width of each block is volume;
        height is osmolarity, so block area is the solute it holds. Dashed outlines show the normal starting state.
      </p>

      <div className="controls">
        <div>
          <h2>Fluid type</h2>
          <div className="seg" role="group" aria-label="Fluid type">
            {(['isotonic', 'hypotonic', 'hypertonic'] as Tonicity[]).map(t => (
              <button key={t} id={`tonicity-${t}`} aria-pressed={tonicity === t} onClick={() => setTonicity(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="note">{FLUID_NOTE[tonicity]}</div>
        </div>
        <div>
          <h2>
            Volume {gain ? 'gained' : none ? 'changed' : 'lost'}: <span className="vol">{f1(Math.abs(liters))} L</span>
          </h2>
          <input id="fluid-volume" type="range" min={-5} max={5} step={0.5} value={liters}
            aria-label="Fluid lost or gained, liters" onChange={e => setLiters(Number(e.target.value))} />
          <div className="scale"><span>Lose 5 L</span><span>0</span><span>Gain 5 L</span></div>
        </div>
      </div>

      <div className="stage">
        <h2 style={{ margin: 0 }}>Show</h2>
        <div className="seg" role="group" aria-label="Stage">
          <button id="stage-before" aria-pressed={stage === 'before'} onClick={() => setStage('before')}>Before water shift</button>
          <button id="stage-after" aria-pressed={stage === 'after'} onClick={() => setStage('after')}>After water shift</button>
        </div>
      </div>

      <div className="main">
        <div className="figure">
          <svg viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label={`ICF ${f1(icfVol)} liters at ${f0(icfOsm)} milliosmoles; ECF ${f1(ecfVol)} liters at ${f0(ecfOsm)} milliosmoles`}>
            {ticks.map(t => (
              <g key={t}>
                <line x1={left} x2={W - 10} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
                <text x={left - 6} y={y(t) + 4} textAnchor="end">{t}</text>
              </g>
            ))}
            <text x={12} y={(top + bottom) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(top + bottom) / 2})`}>
              Osmolarity (mOsm/L)
            </text>

            {/* ICF block grows leftward from the membrane, ECF rightward */}
            <rect x={axisX - icfVol * PX} y={y(icfOsm)} width={icfVol * PX} height={bottom - y(icfOsm)} fill="var(--icf)" />
            <rect x={axisX} y={y(ecfOsm)} width={ecfVol * PX} height={bottom - y(ecfOsm)} fill="var(--ecf)" />

            {/* Baseline outlines */}
            <rect x={axisX - BASE_ICF * PX} y={y(BASE_OSM)} width={BASE_ICF * PX} height={bottom - y(BASE_OSM)}
              fill="none" stroke="var(--ink)" strokeOpacity="0.55" strokeDasharray="5 4" />
            <rect x={axisX} y={y(BASE_OSM)} width={BASE_ECF * PX} height={bottom - y(BASE_OSM)}
              fill="none" stroke="var(--ink)" strokeOpacity="0.55" strokeDasharray="5 4" />

            {/* Normal osmolarity reference */}
            <line x1={left} x2={W - 10} y1={y(BASE_OSM)} y2={y(BASE_OSM)} stroke="var(--osm)" strokeDasharray="3 3" />
            <text x={W - 12} y={y(BASE_OSM) - 4} textAnchor="end" style={{ fill: 'var(--osm)' }}>normal 290</text>

            {/* Cell membrane */}
            <line x1={axisX} x2={axisX} y1={top - 6} y2={bottom} stroke="var(--ink)" strokeWidth="2" />
            <text x={axisX} y={top - 8} textAnchor="middle">cell membrane</text>

            <text x={axisX - (icfVol * PX) / 2} y={bottom - 12} textAnchor="middle" style={{ fill: 'var(--icf-ink)', fontWeight: 700 }}>ICF</text>
            <text x={axisX + (ecfVol * PX) / 2} y={bottom - 12} textAnchor="middle" style={{ fill: 'var(--ecf-ink)', fontWeight: 700 }}>ECF</text>

            {/* Volume axis */}
            <line x1={left} x2={W - 10} y1={bottom} y2={bottom} stroke="var(--ink)" />
            {[30, 20, 10].map(v => <text key={`i${v}`} x={axisX - v * PX} y={bottom + 14} textAnchor="middle">{v}</text>)}
            {[10, 20].map(v => <text key={`e${v}`} x={axisX + v * PX} y={bottom + 14} textAnchor="middle">{v}</text>)}
            <text x={axisX - 8} y={bottom + 34} textAnchor="end">← ICF volume (L)</text>
            <text x={axisX + 8} y={bottom + 34} textAnchor="start">ECF volume (L) →</text>
          </svg>

          <div className="readout">
            <div>ICF volume<b>{f1(icfVol)} L</b></div>
            <div>ECF volume<b>{f1(ecfVol)} L</b></div>
            <div>Osmolarity ICF / ECF<b>{f0(icfOsm)} / {f0(ecfOsm)}</b></div>
            <div>Cells<b>{icfVol > BASE_ICF + 0.05 ? 'Swollen' : icfVol < BASE_ICF - 0.05 ? 'Shrunken' : 'Normal'}</b></div>
          </div>
        </div>
      </div>

      <div className="verdict">
        <span className="chip">{none ? 'Normal state' : `${osmWord} ${volWord}`}</span>
        {example && <span className="eg">e.g., {example}</span>}
      </div>

      <h2>Three questions, in order</h2>
      <ol className="steps">
        <li>
          <span className="num">1</span>
          <div>
            <div className="q">Did the ECF gain or lose fluid?</div>
            <div className="rule">Fluid always enters and leaves the body through the ECF. Gain → ECF volume up. Loss → ECF volume down.</div>
            <div className={`ans ${cls(ecfTrend)}`}>
              {arrow(ecfTrend)} {none ? 'No change' : `ECF volume ${gain ? 'rises' : 'falls'} (${BASE_ECF} → ${f1(s.ecfBefore)} L)`}
            </div>
          </div>
        </li>
        <li>
          <span className="num">2</span>
          <div>
            <div className="q">Is that fluid more or less concentrated than plasma?</div>
            <div className="rule">
              Gain dilute fluid or lose concentrated fluid → ECF osmolarity falls. Gain concentrated fluid or lose dilute
              fluid → it rises. Isotonic fluid → no change.
            </div>
            <div className={`ans ${cls(osmTrend)}`}>
              {arrow(osmTrend)} {osmTrend === 0 ? 'ECF osmolarity unchanged (290)' : `ECF osmolarity ${osmTrend > 0 ? 'rises' : 'falls'} (290 → ${f0(s.osmBefore)})`}
            </div>
          </div>
        </li>
        <li>
          <span className="num">3</span>
          <div>
            <div className="q">Does the ECF now differ from the cells?</div>
            <div className="rule">
              Cells start at 290. Water moves toward the higher osmolarity until both sides match. ECF higher → water
              leaves cells (shrink). ECF lower → water enters cells (swell). Same → no shift.
            </div>
            <div className={`ans ${cls(icfTrend)}`}>
              {icfTrend === 0
                ? '— No water shift; cells unchanged'
                : `${arrow(icfTrend)} Water moves ${icfTrend > 0 ? 'into' : 'out of'} cells: ICF ${BASE_ICF} → ${f1(s.icfAfter)} L, ECF ends at ${f1(s.ecfAfter)} L, both at ${f0(s.osmAfter)} mOsm/L`}
            </div>
          </div>
        </li>
      </ol>

      <footer>
        © 2024 Ian Victor Joseph Murray · CC BY-NC-SA 4.0 · Model assumes 42 L total body water (ICF 28 L, ECF 14 L),
        290 mOsm/L, and that cells neither gain nor lose solute.
      </footer>
    </div>
  );
};

export default DarrowYannettDiagram;
