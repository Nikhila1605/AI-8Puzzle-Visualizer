// puzzle.js
// Everything about the 8-puzzle itself: how a state is stored, which moves
// are legal, input validation, the solvability check and random puzzles.
// Nothing in this file knows about BFS or about the web page.
//
// HOW A STATE IS STORED
// A board is a 9-character string read row by row, left to right.
// "0" stands for the blank. Example: "283164705" means
//
//     2 8 3
//     1 6 4
//     7 _ 5
//
// Strings are easy to compare (===), easy to print and can be used directly
// as keys in a Map, which is exactly what BFS needs for its visited set.

const SIZE = 3; // 3 x 3 board

// The four directions the BLANK can move, in the fixed order BFS tries them.
// (Moving the blank up is the same as sliding the tile above it down.)
const MOVES = [
  { name: 'Up', dRow: -1, dCol: 0 },
  { name: 'Down', dRow: 1, dCol: 0 },
  { name: 'Left', dRow: 0, dCol: -1 },
  { name: 'Right', dRow: 0, dCol: 1 },
];

// Two ready-made goal states. The first one is the goal used in the
// assignment example, the second is the common "1..8 then blank" layout.
const GOAL_PRESETS = {
  spiral: '123804765',
  ordered: '123456780',
};

// Initial state from the assignment example.
const EXAMPLE_START = '283164705';

// Returns a new string with the characters at positions i and j swapped.
function swapTiles(state, i, j) {
  const tiles = state.split('');
  const temp = tiles[i];
  tiles[i] = tiles[j];
  tiles[j] = temp;
  return tiles.join('');
}

// Successor function: all states reachable with ONE legal blank move.
// Returns an array like [{ state: '...', move: 'Up' }, ...]
function getSuccessors(state) {
  const blank = state.indexOf('0');
  const row = Math.floor(blank / SIZE);
  const col = blank % SIZE;
  const successors = [];

  for (const move of MOVES) {
    const newRow = row + move.dRow;
    const newCol = col + move.dCol;
    // skip moves that would push the blank off the board
    if (newRow < 0 || newRow >= SIZE || newCol < 0 || newCol >= SIZE) continue;

    const target = newRow * SIZE + newCol;
    successors.push({ state: swapTiles(state, blank, target), move: move.name });
  }
  return successors;
}

// Checks 9 raw cell values typed by the user.
// A cell may be "1".."8", or "0", "_" or empty for the blank.
// Returns { ok: true, state } or { ok: false, error }.
function validateCells(cells, label) {
  if (cells.length !== 9) {
    return { ok: false, error: `${label}: expected 9 cells but got ${cells.length}.` };
  }

  const tiles = [];
  for (let i = 0; i < 9; i++) {
    const value = String(cells[i]).trim();
    if (value === '' || value === '_' || value === '0') {
      tiles.push('0');
    } else if (/^[1-8]$/.test(value)) {
      tiles.push(value);
    } else {
      return {
        ok: false,
        error: `${label}: "${value}" is not allowed. Use the numbers 1-8 and leave one cell blank (or type 0 / _).`,
      };
    }
  }

  const blanks = tiles.filter(t => t === '0').length;
  if (blanks !== 1) {
    return { ok: false, error: `${label}: there must be exactly one blank cell (found ${blanks}).` };
  }

  // With 9 cells and one blank, a duplicate always means another tile is
  // missing, so report both together.
  const repeated = [];
  const missing = [];
  for (let n = 1; n <= 8; n++) {
    const count = tiles.filter(t => t === String(n)).length;
    if (count > 1) repeated.push(`tile ${n} appears ${count} times`);
    if (count === 0) missing.push(n);
  }
  if (repeated.length > 0 || missing.length > 0) {
    const parts = [...repeated];
    if (missing.length > 0) parts.push(`tile${missing.length > 1 ? 's' : ''} ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} missing`);
    return { ok: false, error: `${label}: ${parts.join(' and ')}.` };
  }

  return { ok: true, state: tiles.join('') };
}

// Counts inversions: pairs of tiles (a before b in reading order) with a > b.
// The blank is ignored.
function countInversions(state) {
  const tiles = state.split('').filter(t => t !== '0').map(Number);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) inversions++;
    }
  }
  return inversions;
}

// On a 3x3 board a move never changes whether the inversion count is
// even or odd (left/right moves keep the reading order of the tiles; an
// up/down move jumps one tile over exactly 2 others, changing the count by
// -2, 0 or +2). So start can reach goal exactly when both have the same parity.
function isSolvable(start, goal) {
  return countInversions(start) % 2 === countInversions(goal) % 2;
}

// ---- Heuristics (shown on the comparison page only; BFS does NOT use them) ----

function misplacedTiles(state, goal) {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (state[i] !== '0' && state[i] !== goal[i]) count++;
  }
  return count;
}

function manhattanDistance(state, goal) {
  let total = 0;
  for (let i = 0; i < 9; i++) {
    const tile = state[i];
    if (tile === '0') continue;
    const j = goal.indexOf(tile);
    total += Math.abs(Math.floor(i / SIZE) - Math.floor(j / SIZE)) + Math.abs((i % SIZE) - (j % SIZE));
  }
  return total;
}

// ---- Random puzzles ----

// Scrambles the goal with `steps` random blank moves (never undoing the
// previous move straight away). Always solvable because we only made legal
// moves. The real BFS distance can still be shorter than `steps`.
function randomWalkPuzzle(goal, steps) {
  let state = goal;
  let previous = null;
  for (let i = 0; i < steps; i++) {
    const options = getSuccessors(state).filter(s => s.state !== previous);
    const pick = options[Math.floor(Math.random() * options.length)];
    previous = state;
    state = pick.state;
  }
  return state;
}

// Any random solvable arrangement: shuffle all 9 cells, and if the parity is
// wrong, swap two numbered tiles (one swap flips the inversion parity).
function randomSolvablePuzzle(goal) {
  const tiles = goal.split('');
  for (let i = tiles.length - 1; i > 0; i--) { // Fisher-Yates shuffle
    const j = Math.floor(Math.random() * (i + 1));
    const temp = tiles[i];
    tiles[i] = tiles[j];
    tiles[j] = temp;
  }
  let state = tiles.join('');
  if (!isSolvable(state, goal)) {
    const a = state[0] === '0' ? 2 : 0; // pick two positions that are not the blank
    const b = state[1] === '0' ? 2 : 1;
    state = swapTiles(state, a, b);
  }
  return state;
}

// Pretty text version, e.g. "2 8 3 / 1 6 4 / 7 _ 5"
function stateToText(state) {
  const cells = state.split('').map(t => (t === '0' ? '_' : t));
  return `${cells.slice(0, 3).join(' ')} / ${cells.slice(3, 6).join(' ')} / ${cells.slice(6).join(' ')}`;
}
