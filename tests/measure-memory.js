// Estimates how many bytes one stored BFS node takes in the V8 engine
// (the JavaScript engine used by Chrome, Edge and Node.js).
// Run with:   node --expose-gc tests/measure-memory.js
//
// Method: force garbage collection, note the heap size, run a BFS that stores
// all 181,440 reachable states, force GC again while still holding the
// result, and divide the growth by the number of stored nodes.
// The result includes the node object, its state string, the Map (visited)
// entry and the steps[] record. Other browsers/engines will differ.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (typeof global.gc !== 'function') {
  console.log('Please run with:  node --expose-gc tests/measure-memory.js');
  process.exit(1);
}

const sandbox = { performance, Math, Map };
vm.createContext(sandbox);
for (const file of ['js/puzzle.js', 'js/bfs.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox);
}
const bfsSolve = vm.runInContext('bfsSolve', sandbox);

// One measurement per run of this script (run it a few times and compare).
global.gc();
const before = process.memoryUsage().heapUsed;
const result = bfsSolve('213804765', '123804765'); // unsolvable -> stores all 181,440 states
global.gc();
const after = process.memoryUsage().heapUsed;
const perNode = (after - before) / result.stats.stored;
console.log(`stored=${result.stats.stored}, heap growth=${((after - before) / 1048576).toFixed(1)} MB, ` +
  `${perNode.toFixed(0)} bytes per stored node (Node ${process.version})`);
