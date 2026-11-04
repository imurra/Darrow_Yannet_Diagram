# Darrow–Yannett Diagram — Fluid Balance and Tonicity

Interactive tools for teaching fluid compartments, osmolarity and water shifts in medical education.

## Tools

### 1. Explorer — `explorer/`
Gain or lose isotonic, hypotonic or hypertonic fluid and watch the ECF and ICF respond.
- Mass-balance model: fluid enters and leaves through the ECF; cells keep their solute
- **Before / after water shift** toggle shows the moment ECF and ICF osmolarity disagree, then the new equilibrium
- Names each state (e.g., hyperosmotic volume contraction) with a clinical example
- Three questions answered live:
  1. Did the ECF gain or lose fluid?
  2. Is that fluid more or less concentrated than plasma?
  3. Does the ECF now differ from the cells? Water moves toward the higher osmolarity.

Open: `explorer/index.html`

### 2. Bedside — `bedside/`
A six-step case activity in bedside order, on a live diagram:
1. Danger (brain, circulation)
2. Wet or dry (exam → ECF volume)
3. Where does sodium put the tonicity line? (glucose included; scored)
4. Predict the cells (drag the ICF edge)
5. Read the kidney (urine osm and Na⁺ → cause)
6. Treatment (where salt and water should go, then a fluid)

8 cases: diarrhea, marathon runner, SIADH, heart failure, Addison's, elderly dehydration, lithium DI, hyperglycemia.
`bedside/index.html` is self-contained and works offline.

## Hosting
With GitHub Pages on (Settings → Pages → Deploy from branch `main`):
- Explorer: `https://imurra.github.io/Darrow_Yannet_Diagram/explorer/`
- Bedside: `https://imurra.github.io/Darrow_Yannet_Diagram/bedside/`

## Model
- Baseline 42 L total body water: ICF 28 L, ECF 14 L, 290 mOsm/L
- Effective osmoles (Na⁺ salts, glucose) stay in the ECF; ICF solute is fixed; urea crosses membranes freely
- Directions of change have been checked for every fluid type, volume and case

## Archive
The original 2024 dashboard is in `archive/`. It was replaced because two loss cases moved water the wrong way; see `archive/README.md`.

## License
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
- Attribution required to Ian Murray
- Non-commercial use only
- Educational use permitted
- Share-alike requirement for derivative works

## Contact
Author: Ian Victor Joseph Murray
Email: imurra@yahoo.com
