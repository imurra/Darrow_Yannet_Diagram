# Darrow–Yannet at the Bedside

Interactive case activity for teaching fluid compartments, tonicity and water shifts in medical education.

**Live page:** https://imurra.github.io/Darrow_Yannet_Diagram/ (opens the activity)

## The activity — `bedside/`
Six steps in bedside order, on a live Darrow–Yannet diagram:
1. Danger (brain, circulation)
2. Wet or dry (exam → ECF volume)
3. Where does sodium put the tonicity line? (glucose included; scored)
4. Predict the cells (water in, out or no shift; drawn on the diagram)
5. Read the kidney (urine osm and Na⁺ → cause)
6. Treatment (where salt and water should go, then a fluid)

4 core cases: diarrhea, SIADH, heart failure, hyperglycemia.
Extra practice (optional): marathon runner, Addison's, elderly dehydration, lithium DI.
`bedside/index.html` is self-contained and works offline.

## Hosting
GitHub Pages (Settings → Pages → Deploy from branch `main`, `/ (root)`).
The site root redirects to `bedside/`. `_config.yml` keeps `archive/` off the published site.

## Model
- Baseline 42 L total body water: ICF 28 L, ECF 14 L, 290 mOsm/L
- Effective osmoles (Na⁺ salts, glucose) stay in the ECF; ICF solute is fixed; urea crosses membranes freely
- Directions of change have been checked for every case and treatment

## Archive (not published)
- `archive/explorer/` — the corrected fluid-type Explorer (gain or lose isotonic, hypotonic or hypertonic fluid; before/after water shift; three-question walkthrough)
- `archive/Darrow Yannet fluid-balance-dashboard- cc commons.tsx` — the original 2024 dashboard; see `archive/README.md`

## License
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
- Attribution required to Ian Murray
- Non-commercial use only
- Educational use permitted
- Share-alike requirement for derivative works

## Contact
Author: Ian Victor Joseph Murray
Email: imurra@yahoo.com
