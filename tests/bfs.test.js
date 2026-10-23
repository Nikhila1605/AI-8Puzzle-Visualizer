// Automated checks for puzzle.js and bfs.js.
// Run from the project folder with:   node tests/bfs.test.js
// (Needs Node.js 16 or newer. The website itself does not need Node.)
//
// The two browser files are loaded into one shared sandbox with Node's `vm`
// module, so the tests use exactly the same code the web page uses.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { performance, console, Math, Map, Set };
vm.createContext(sandbox);
for (const file of ['js/puzzle.js', 'js/bfs.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox, { filename: file });
}
const P = vm.runInContext(
  '({ GOAL_PRESETS, EXAMPLE_START, getSuccessors, validateCells, isSolvable, misplacedTiles, ' +
  'manhattanDistance, randomWalkPuzzle, randomSolvablePuzzle, bfsSolve, describeStep })',
  sandbox
);

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${detail}`); }
}

// ---------- independent helpers (do not reuse bfs.js) ----------

// True if b can be reached from a with exactly one legal blank move.
function oneLegalMoveApart(a, b) {
  const blankA = a.indexOf('0');
  const blankB = b.indexOf('0');
  const rowDiff = Math.abs(Math.floor(blankA / 3) - Math.floor(blankB / 3));
  const colDiff = Math.abs((blankA % 3) - (blankB % 3));
  if (rowDiff + colDiff !== 1) return false;
  for (let i = 0; i < 9; i++) {
    if (i === blankA || i === blankB) continue;
    if (a[i] !== b[i]) return false;
  }
  return a[blankB] === b[blankA];
}

function pathIsLegal(result) {
  const p = result.path;
  if (p[0].state !== result.start || p[p.length - 1].state !== result.goal) return false;
  for (let i = 1; i < p.length; i++) {
    if (!oneLegalMoveApart(p[i - 1].state, p[i].state)) return false;
  }
  return true;
}

// Depth-limited DFS with no visited set: does ANY path of length <= limit exist?
// Brute force, completely separate from the BFS code; only practical for small limits.
function existsPathWithin(start, goal, limit) {
  function dfs(state, previous, depthLeft) {
    if (state === goal) return true;
    if (depthLeft === 0) return false;
    const blank = state.indexOf('0');
    const r = Math.floor(blank / 3);
    const c = blank % 3;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
      const t = state.split('');
      t[blank] = t[nr * 3 + nc];
      t[nr * 3 + nc] = '0';
      const next = t.join('');
      if (next === previous) continue;
      if (dfs(next, state, depthLeft - 1)) return true;
    }
    return false;
  }
  return dfs(start, null, limit);
}

const SPIRAL = P.GOAL_PRESETS.spiral;
const ORDERED = P.GOAL_PRESETS.ordered;

console.log('\nT1  Initial state equals goal');
{
  const r = P.bfsSolve(SPIRAL, SPIRAL);
  check('solution found with 0 moves', r.found && r.stats.moves === 0);
  check('1 generated, 0 expanded', r.stats.generated === 1 && r.stats.expanded === 0);
}

console.log('\nT2  One move from goal');
{
  const start = '123084765'; // blank moved left from the spiral goal
  const r = P.bfsSolve(start, SPIRAL);
  check('1 move', r.found && r.stats.moves === 1, JSON.stringify(r.stats));
  check('path is legal', pathIsLegal(r));
  check('move recorded is "Right"', r.path[1].move === 'Right');
}

console.log('\nT3  Assignment example (several moves)');
{
  const r = P.bfsSolve(P.EXAMPLE_START, SPIRAL);
  check('solution found', r.found);
  check('path is legal', pathIsLegal(r));
  check('first two moves match the assignment sheet (Up, Up)', r.path[1].move === 'Up' && r.path[2].move === 'Up');
  const d = r.stats.moves;
  check(`no path shorter than ${d} exists (brute force)`, !existsPathWithin(P.EXAMPLE_START, SPIRAL, d - 1));
  console.log(`        moves=${d} generated=${r.stats.generated} expanded=${r.stats.expanded} ` +
    `stored=${r.stats.stored} maxDepth=${r.stats.maxDepth} maxFrontier=${r.stats.maxFrontier}`);
  console.log('        path: ' + r.path.map(p => p.move || 'start').join(' -> '));
}

console.log('\nT4-T5  Input validation');
{
  check('duplicate tile rejected', !P.validateCells(['1', '2', '3', '8', '', '4', '7', '6', '6'], 'X').ok);
  check('missing tile message', /tile 5 is missing/.test(P.validateCells(['1', '2', '3', '8', '', '4', '7', '6', '6'], 'X').error));
  check('two blanks rejected', !P.validateCells(['1', '2', '3', '8', '', '4', '7', '', '5'], 'X').ok);
  check('"9" rejected', !P.validateCells(['1', '2', '3', '8', '', '4', '7', '6', '9'], 'X').ok);
  check('letters rejected', !P.validateCells(['a', '2', '3', '8', '', '4', '7', '6', '5'], 'X').ok);
  check('only 8 cells rejected', !P.validateCells(['1', '2', '3', '8', '', '4', '7', '6'], 'X').ok);
  const ok = P.validateCells(['2', '8', '3', '1', '6', '4', '7', '_', '5'], 'X');
  check('valid input with "_" accepted', ok.ok && ok.state === '283164705');
}

console.log('\nT6  Unsolvable state');
{
  const unsolvable = '213804765'; // spiral goal with tiles 1 and 2 swapped
  check('solvability check says no', !P.isSolvable(unsolvable, SPIRAL));
  const r = P.bfsSolve(unsolvable, SPIRAL); // what happens if BFS is run anyway
  check('BFS reports not found', !r.found);
  check('BFS explored the whole reachable half: 181,440 states', r.stats.stored === 181440, `stored=${r.stats.stored}`);
  console.log(`        time=${r.stats.timeMs.toFixed(0)} ms`);
}

console.log('\nT7/T11/T12  Random solvable puzzles: legality and optimality');
{
  // Reference distances: one full backward BFS from the goal, written separately here.
  const dist = new Map([[ORDERED, 0]]);
  const queue = [ORDERED];
  for (let q = 0; q < queue.length; q++) {
    const s = queue[q];
    for (const n of P.getSuccessors(s)) {
      if (!dist.has(n.state)) { dist.set(n.state, dist.get(s) + 1); queue.push(n.state); }
    }
  }
  check('reference table covers 181,440 states', dist.size === 181440);
  check('hardest instance needs 31 moves', [...dist.values()].reduce((a, b) => Math.max(a, b), 0) === 31);

  let allLegal = true;
  let allOptimal = true;
  let allSolvable = true;
  for (let i = 0; i < 150; i++) {
    const start = i % 2 ? P.randomSolvablePuzzle(ORDERED) : P.randomWalkPuzzle(ORDERED, 1 + (i % 30));
    if (!P.isSolvable(start, ORDERED)) allSolvable = false;
    const r = P.bfsSolve(start, ORDERED);
    if (!r.found || !pathIsLegal(r)) allLegal = false;
    if (r.stats.moves !== dist.get(start)) allOptimal = false;
  }
  check('150 random puzzles all pass the solvability check', allSolvable);
  check('150 random puzzles: every path legal', allLegal);
  check('150 random puzzles: BFS length = true shortest distance', allOptimal);

  // Brute-force cross-check on small cases (independent of any BFS).
  let bruteOk = true;
  for (let i = 0; i < 25; i++) {
    const start = P.randomWalkPuzzle(SPIRAL, 2 + (i % 7));
    const d = P.bfsSolve(start, SPIRAL).stats.moves;
    if (d > 0 && existsPathWithin(start, SPIRAL, d - 1)) bruteOk = false;
    if (!existsPathWithin(start, SPIRAL, d)) bruteOk = false;
  }
  check('25 small cases: brute force finds nothing shorter than BFS', bruteOk);

  const hard = P.bfsSolve('867254301', ORDERED);
  check('known 31-move instance solved in 31 moves', hard.stats.moves === 31);
  console.log(`        31-move instance: expanded=${hard.stats.expanded} stored=${hard.stats.stored} time=${hard.stats.timeMs.toFixed(0)} ms`);
}

console.log('\nRecorded trace consistency (what the visualizer replays)');
{
  const r = P.bfsSolve(P.EXAMPLE_START, SPIRAL);
  let newCount = 0;
  let generatedOk = true;
  let lastGenerated = 1;
  for (let k = 0; k < r.steps.length; k++) {
    const s = P.describeStep(r, k);
    newCount += s.children.filter(c => c.status !== 'repeat').length;
    if (s.generated !== lastGenerated + s.children.length) generatedOk = false;
    lastGenerated = s.generated;
  }
  check('new children over all steps = stored - 1', newCount === r.stats.stored - 1);
  check('generated count grows by number of successors each step', generatedOk);
  const last = P.describeStep(r, r.steps.length - 1);
  check('last step contains the goal child', last.children.some(c => c.status === 'goal'));
  check('heuristics are lower bounds here', P.manhattanDistance(P.EXAMPLE_START, SPIRAL) <= r.stats.moves &&
    P.misplacedTiles(P.EXAMPLE_START, SPIRAL) <= r.stats.moves);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
