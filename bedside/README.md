# Darrow–Yannet at the Bedside

Interactive case activity that follows the bedside order:
1. Danger: brain, circulation, both or neither?
2. Wet or dry (exam → ECF volume). The fluid lands in the ECF first; the diagram changes ECF width only.
3. Where does sodium put the tonicity line? (glucose included). After Check, the ECF takes its new height while the cells stay at 285.
4. Predict the cells from that gradient (water in, out or no shift; drawn as an arrow) and say why. After Check, water moves until both sides meet the line.
5. Read the kidney: holding or losing water and salt, and is that response homeostatic or part of the problem?
6. Put the story together: tap the causal chain into order, then read the debrief (illness script).

There is no treatment step. Scored out of 9 per case.

Each step has a Reset button; only the first answer is scored. 
4 core cases: diarrhea, SIADH, heart failure, hyperglycemia.
Extra practice (optional, shown after the core cases): marathon runner, Addison's, elderly dehydration, lithium DI.

`index.html` is self-contained and works offline: open it in a browser or host it with GitHub Pages.

## Source
- `src/engine.ts` — mass-balance model (salt, glucose, urea; ICF solute fixed)
- `src/cases.ts` — case library, expected answers, causal chains and debriefs (treatment grades kept as data but not shown)
- `src/BedsideFlow.tsx` — React interface
- `src/styles.css` — styles (light and dark)

Teaching model: 42 L body water, effective osmoles only; urine values are illustrative.

© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0
