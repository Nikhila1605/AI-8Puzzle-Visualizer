# Test plan and results

Tests were run on **22 October 2026**.
*Automated (Node)* = `node tests/bfs.test.js` with Node.js 22.
*Browser (scripted)* = a Playwright script driving headless Chromium 141 at 1366 × 900 and 390 × 844.
Anything not yet run is marked **Pending** – do not change it to Pass until you have done it yourself.

Puzzles use the goal `1 2 3 / 8 _ 4 / 7 6 5` unless stated.

| # | Test | Input / action | Expected | Actual result | Method | Status |
|---|---|---|---|---|---|---|
| 1 | Initial = goal | `1 2 3 / 8 _ 4 / 7 6 5` | Found, 0 moves, 1 generated, 0 expanded | As expected; solution view shows "Step 0 of 0" | Node + Browser | Pass |
| 2 | One move from goal | `1 2 3 / _ 8 4 / 7 6 5` | 1 move (blank Right) | 1 move, move = Right, path legal | Node + Browser | Pass |
| 3 | Several moves | Assignment example `2 8 3 / 1 6 4 / 7 _ 5` | Shortest solution | 5 moves: Up, Up, Left, Down, Right; 54 generated, 20 expanded, 35 stored; first two moves match the sheet | Node + Browser | Pass |
| 4 | Duplicate tile | `2 8 3 / 1 6 4 / 7 _ 7` | Rejected with clear message | "Initial state: tile 7 appears 2 times and tile 5 is missing." No search started | Node + Browser | Pass |
| 5 | Missing tile / wrong blanks | Two blanks; a `9`; a letter; 8 cells | Rejected | Each rejected with its own message | Node + Browser | Pass |
| 6 | Unsolvable | `2 1 3 / 8 _ 4 / 7 6 5` | Rejected by parity check | Message gives both inversion counts (8 and 7). With the override switch on, BFS stores 181,440 states and reports Not Found | Node + Browser | Pass |
| 7 | Random solvable | *Generate Random Puzzle* (all four modes) | Always solvable and solved | 150 random puzzles (Node) all pass parity check and are solved; "Any solvable" solved in browser | Node + Browser | Pass |
| 8 | Reset | Click Reset after a run | Back to empty state, controls disabled, inputs kept | As expected | Browser | Pass |
| 9 | Next / Previous | Pause, Next ×2, Previous ×1; also in solution view | Moves exactly one step each time | As expected in both views | Browser | Pass |
| 10 | Pause / Resume / Speed | Pause, wait 1.5 s, Resume; change speed | Pause freezes the step; Resume continues; label shows delay | As expected; search replay finishes and switches to solution view | Browser | Pass |
| 11 | Path reconstruction | Every solution | Starts at initial, ends at goal, each pair one legal move apart | Checked by an independent function for 150 + 25 + 3 puzzles | Node | Pass |
| 12 | BFS optimality | Small and random cases | Length = true shortest distance | 150 random puzzles match an independently computed distance table of all 181,440 states; 25 small puzzles checked by brute-force search; known 31-move instance solved in 31 | Node | Pass |
| 13a | Responsive layout | 390 px wide viewport, all four pages | No horizontal page scroll; menu works | scrollWidth ≤ 390 on all pages; hamburger menu opens, navigates and closes | Browser | Pass |
| 13b | Real phone | Open the live site on your phone | Usable | – | Manual | **Pending** |
| 13c | Other browsers | Firefox and Edge on your laptop | Same behaviour | – | Manual | **Pending** |
| 13d | GitHub Pages | Open `https://<username>.github.io/AI-8Puzzle-Visualizer/` and repeat test 3 | Same result as locally, no 404 for CSS/JS | – | Manual (after deployment) | **Pending** |
| 14 | Replay trace consistency | Assignment example | Frontier/explored/counters shown for each step agree with the search | New children over all steps = stored − 1; generated counter increases by the number of successors each step; last step contains the goal | Node | Pass |
| 15 | Console errors | Full scripted session | None | None from the app. (The test sandbox blocks Google Fonts, which shows one network error there only) | Browser | Pass |

**Totals:** 30/30 automated checks and 39/39 scripted browser checks passed. Tests 13b–13d are still to be done by the student.

## Benchmark (comparison page → *Run benchmark set*)

Headless Chrome 141 on a cloud Linux VM, median time of 3 runs. Counts are deterministic and will be identical on any machine; times will not.

| Initial state | Moves | Generated | Expanded | Repeats | Stored | Peak frontier | Time (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 283164705 | 5 | 54 | 20 | 19 | 35 | 15 | < 0.1 |
| 810723654 | 8 | 264 | 97 | 100 | 164 | 67 | 0.1 |
| 780143625 | 12 | 2,364 | 867 | 960 | 1,404 | 537 | 0.8 |
| 078643215 | 16 | 19,661 | 7,089 | 8,232 | 11,429 | 4,340 | 5.8 |
| 034765281 | 20 | 84,207 | 31,125 | 39,574 | 44,633 | 13,508 | 33.6 |
| 657803241 | 24 | 297,981 | 111,561 | 165,628 | 132,353 | 24,983 | 178.7 |
| 657384021 | 28 | 469,452 | 175,620 | 289,377 | 180,075 | 24,053 | 275.4 |
| 547608231 | 30 | 482,469 | 180,974 | 301,087 | 181,382 | 24,983 | 274.1 |

## Memory measurement

`node --expose-gc tests/measure-memory.js` (3 separate runs): heap growth 34.5 MB for 181,440 stored nodes = **199 bytes per node** each time. The app uses 200 bytes per stored node for its estimate.
