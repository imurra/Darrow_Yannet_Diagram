# Archive

`Darrow Yannett fluid-balance-dashboard- cc commons.tsx` is the original 2024 version, kept for reference.

It was replaced in October 2026 because two cases moved water the wrong way:
- Loss of hypotonic fluid (e.g., sweating) lowered osmolarity and swelled cells; it should raise osmolarity and shrink cells.
- Loss of hypertonic fluid (e.g., adrenal insufficiency) raised osmolarity and shrank cells; it should lower osmolarity and swell cells.

It also used fixed 75/25 volume splits rather than mass balance.

`explorer/` is the corrected replacement for that dashboard (mass balance, before/after water shift). It is kept here, unpublished, now that `bedside/` is the public page.

Nothing in `archive/` is published to GitHub Pages (see `_config.yml`).
