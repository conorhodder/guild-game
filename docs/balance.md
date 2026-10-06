# MVP balance measurements

`npm run balance` runs the deterministic headless player policy against the
real game actions and simulation engine using seeds `4242`, `8675309`, and
`20250101`.

## S-4: starter progression

Hours until the first starter hero reaches each level:

| Seed | Level 10 | Level 20 |
| --- | ---: | ---: |
| 4242 | 4.92 h | 35.33 h |
| 8675309 | 5.58 h | 37.50 h |
| 20250101 | 5.33 h | 37.50 h |

All three seeds are within the S-4 windows: 3–6 hours to level 10 and 20–40
hours to level 20.

## S-5: first Named item drop by camp

Each cell is simulated hours until the party receives its first Named item from
that camp. The final column is the median across the three seeds.

| Named camp | 4242 | 8675309 | 20250101 | Median |
| --- | ---: | ---: | ---: | ---: |
| Marsh Edge | 1.03 h | 3.85 h | 6.78 h | 3.85 h |
| Hollow Mire | 1.22 h | 2.37 h | 2.47 h | 2.37 h |
| Cinder Fields | 0.62 h | 6.10 h | 16.03 h | 6.10 h |
| Glasswood | 7.47 h | 5.52 h | 2.57 h | 5.52 h |
| Shattered Ridge | 5.63 h | 2.58 h | 0.23 h | 2.58 h |
| Starfall Trench | 3.90 h | 7.35 h | 2.75 h | 3.90 h |

Every camp median is within the S-5 window of 2–8 hours. Marsh Edge is included
in the measurement.
