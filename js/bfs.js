// bfs.js
// Breadth-First Search for the 8-puzzle, written from scratch.
// Uses getSuccessors() from puzzle.js.
//
// THE THREE DATA STRUCTURES
//  1. nodes   - an array holding every node BFS has stored, in the order the
//               nodes were added. Each node is
//               { state, parent, move, depth }
//               where parent is the INDEX of the parent node in this array
//               (-1 for the start) and move is the blank move that made it.
//  2. head    - the index of the next node to expand. Everything from `head`
//               to the end of `nodes` is the FRONTIER (the FIFO queue):
//               new nodes join at the back (push), BFS takes from the front
//               (head++). Everything before `head` is the EXPLORED list.
//               Using an index instead of array.shift() keeps each dequeue O(1).
//  3. visited - a Map from state string -> index in `nodes`. A state is put
//               in it the moment it is first generated, so the same board is
//               never queued twice.
//
// COUNTING CONVENTIONS (used everywhere in the app, README and report)
//  - Generated: the start node + every successor created by a legal move,
//               INCLUDING successors thrown away because they were repeats.
//  - Repeats skipped: generated successors that were already in `visited`.
//  - Stored: nodes actually added to `nodes` (= unique states seen).
//  - Expanded: nodes taken from the front of the queue whose successors
//               were generated.
//  - Goal test: done when a node is GENERATED (early goal test), so the goal
//               node is generated but never expanded. If start === goal the
//               search ends at once with 1 generated and 0 expanded.
//  - Depth / path cost: number of moves from the start. Every move costs 1,
//               so path cost g(n) = depth.

// Approximate heap memory one stored node uses in Chrome/Node (V8).
// Measured with tests/measure-memory.js (about 199 bytes in Node 22 / V8)
// for a search that stored all 181,440 states. Rough figure only.
const BYTES_PER_NODE = 200;

function bfsSolve(start, goal) {
  const startTime = performance.now();

  const nodes = [];
  const visited = new Map();
  // steps[k] records the situation right after the k-th expansion,
  // so the visualizer can replay the search afterwards.
  const steps = [];

  let generated = 1; // the start node
  let repeats = 0;
  let maxDepth = 0;
  let maxFrontier = 1;
  let goalIndex = -1;

  nodes.push({ state: start, parent: -1, move: null, depth: 0 });
  visited.set(start, 0);
  if (start === goal) goalIndex = 0;

  let head = 0;
  while (goalIndex === -1 && head < nodes.length) {
    const currentIndex = head; // dequeue from the front
    head++;
    const current = nodes[currentIndex];

    for (const successor of getSuccessors(current.state)) {
      generated++;

      if (visited.has(successor.state)) { // already seen -> skip it
        repeats++;
        continue;
      }

      const child = {
        state: successor.state,
        parent: currentIndex,
        move: successor.move,
        depth: current.depth + 1,
      };
      nodes.push(child); // enqueue at the back
      visited.set(child.state, nodes.length - 1);
      if (child.depth > maxDepth) maxDepth = child.depth;

      if (child.state === goal) { // early goal test
        goalIndex = nodes.length - 1;
        break;
      }
    }

    const frontierSize = nodes.length - head;
    if (frontierSize > maxFrontier) maxFrontier = frontierSize;
    steps.push({ queueEnd: nodes.length, generated, repeats });
  }

  const timeMs = performance.now() - startTime;
  const found = goalIndex !== -1;
  const path = found ? buildPath(nodes, goalIndex) : [];

  return {
    start,
    goal,
    found,
    path, // array of { state, move } from start to goal
    nodes,
    visited,
    steps,
    stats: {
      found,
      moves: found ? path.length - 1 : null,
      pathCost: found ? path.length - 1 : null,
      generated,
      expanded: steps.length,
      repeats,
      stored: nodes.length,
      maxDepth,
      maxFrontier,
      timeMs,
      memoryKB: (nodes.length * BYTES_PER_NODE) / 1024,
    },
  };
}

// Follows parent indexes back from the goal, then reverses the list.
function buildPath(nodes, goalIndex) {
  const path = [];
  let index = goalIndex;
  while (index !== -1) {
    path.push({ state: nodes[index].state, move: nodes[index].move });
    index = nodes[index].parent;
  }
  return path.reverse();
}

// Everything the visualizer needs to show expansion number k (0-based).
// The search is NOT run again; this only reads the arrays BFS recorded.
function describeStep(result, k) {
  const { nodes, steps, visited, goal } = result;
  const node = nodes[k]; // nodes are expanded in the same order they were stored
  const step = steps[k];

  // Rebuild the successor list of this expansion and label each one.
  const children = [];
  for (const successor of getSuccessors(node.state)) {
    const index = visited.get(successor.state);
    let status = 'repeat';
    if (index !== undefined && nodes[index].parent === k) status = 'new';
    if (status === 'new' && successor.state === goal) status = 'goal';
    children.push({ state: successor.state, move: successor.move, status, index });
    if (status === 'goal') break; // BFS stopped generating at the goal
  }

  return {
    index: k,
    node,
    parent: node.parent === -1 ? null : nodes[node.parent],
    children,
    expanded: k + 1,
    generated: step.generated,
    repeats: step.repeats,
    frontierStart: k + 1, // frontier = nodes[frontierStart .. frontierEnd - 1]
    frontierEnd: step.queueEnd,
    frontierSize: step.queueEnd - (k + 1),
    exploredSize: k + 1, // explored = nodes[0 .. k]
  };
}
