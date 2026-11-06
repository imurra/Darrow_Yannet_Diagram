# Darrow–Yannett at the Bedside

Interactive case activity that follows the bedside order:
1. Danger (brain, circulation)
2. Wet or dry (exam → ECF volume)
3. Where does sodium put the tonicity line? (glucose included; scored)
4. Predict the cells (water in, out or no shift; drawn on the diagram)
5. Read the kidney (urine osm and Na⁺ → cause)
6. Treatment (where salt and water should go, then a fluid)

Each step has a Reset button; only the first answer is scored. Every treatment shows guideline-based safety advice (sodium correction limits, osmotic demyelination, overshoot). A Reference tab holds the diagram key, the six states, the kidney's vote, fluids, safety limits, all cases and sources. `card.html` is the printable post-activity card ("Darrow–Yannett, read backward").

8 cases: diarrhea, marathon runner, SIADH, heart failure, Addison's, elderly dehydration, lithium DI, hyperglycemia.

`index.html` is self-contained and works offline: open it in a browser or host it with GitHub Pages.

## Source
- `src/engine.ts` — mass-balance model (salt, glucose, urea; ICF solute fixed)
- `src/cases.ts` — case library, expected answers and treatment grades
- `src/BedsideFlow.tsx` — React interface
- `src/styles.css` — styles (light and dark)

Teaching model: 42 L body water, effective osmoles only; urine values are illustrative.

© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0
