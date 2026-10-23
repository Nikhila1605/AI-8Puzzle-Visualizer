// visualization.js
// Drawing helpers and the playback controller. Nothing here does any
// searching: it only draws states that bfs.js already recorded.

// ---------- Static boards ----------

// Fills `element` with 9 cells for `state`. Options:
//   compareTo - a goal state; tiles already in their goal position get a class
//   moved     - index of the tile that just moved (highlighted)
function drawBoard(element, state, options = {}) {
  element.innerHTML = '';
  element.classList.add('board');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    const tile = state[i];
    cell.className = 'cell';
    if (tile === '0') {
      cell.classList.add('blank');
      cell.setAttribute('aria-label', 'blank');
    } else {
      cell.textContent = tile;
      if (options.compareTo && options.compareTo[i] === tile) cell.classList.add('in-place');
    }
    if (options.moved === i) cell.classList.add('moved');
    element.appendChild(cell);
  }
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', 'Board ' + stateToText(state));
}

// Creates a small labelled board (used in frontier/explored strips etc.)
function makeMiniBoard(state, label, extraClass) {
  const wrap = document.createElement('div');
  wrap.className = 'mini-wrap' + (extraClass ? ' ' + extraClass : '');
  const board = document.createElement('div');
  board.className = 'board-mini';
  drawBoard(board, state);
  wrap.appendChild(board);
  if (label) {
    const caption = document.createElement('div');
    caption.className = 'mini-caption';
    caption.textContent = label;
    wrap.appendChild(caption);
  }
  return wrap;
}

// ---------- Animated board (solution playback) ----------
// The 8 tiles are absolutely positioned and moved with a CSS transform,
// so when a tile and the blank swap places the tile visibly slides.
class AnimatedBoard {
  constructor(element) {
    this.element = element;
    this.element.innerHTML = '';
    this.tiles = {};
    this.blank = document.createElement('div');
    this.blank.className = 'anim-blank';
    this.element.appendChild(this.blank);
    for (let n = 1; n <= 8; n++) {
      const tile = document.createElement('div');
      tile.className = 'anim-tile';
      tile.textContent = n;
      this.element.appendChild(tile);
      this.tiles[n] = tile;
    }
  }

  setDuration(ms) {
    this.element.style.setProperty('--slide-ms', ms + 'ms');
  }

  show(state, goal) {
    for (let i = 0; i < 9; i++) {
      const piece = state[i] === '0' ? this.blank : this.tiles[state[i]];
      const row = Math.floor(i / 3);
      const col = i % 3;
      piece.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
      if (state[i] !== '0') piece.classList.toggle('in-place', goal && goal[i] === state[i]);
    }
    this.element.setAttribute('aria-label', 'Board ' + stateToText(state));
  }
}

// ---------- Player: Run / Pause / Resume / Next / Previous ----------
// Holds a position (0 .. frameCount-1) and calls render(position) whenever
// it changes. When playing, it advances one frame every `delay` ms.
class Player {
  constructor(render, onStateChange) {
    this.render = render;
    this.onStateChange = onStateChange; // tells the page to update buttons
    this.frameCount = 0;
    this.position = 0;
    this.delay = 300;
    this.timer = null;
    this.onFinish = null; // called when playback reaches the last frame
  }

  load(frameCount) {
    this.stop();
    this.frameCount = frameCount;
    this.position = 0;
    if (frameCount > 0) this.render(0);
    this.onStateChange();
  }

  get playing() {
    return this.timer !== null;
  }

  play() {
    if (this.frameCount === 0 || this.playing) return;
    if (this.position >= this.frameCount - 1) { // finished: nothing to play
      if (this.onFinish) this.onFinish();
      return;
    }
    this.timer = setTimeout(() => this.tick(), this.delay);
    this.onStateChange();
  }

  tick() {
    this.timer = null;
    this.goTo(this.position + 1);
    if (this.position < this.frameCount - 1) {
      this.timer = setTimeout(() => this.tick(), this.delay);
      this.onStateChange();
    } else if (this.onFinish) {
      this.onFinish();
    }
  }

  stop() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.onStateChange();
  }

  goTo(position) {
    if (this.frameCount === 0) return;
    this.position = Math.max(0, Math.min(this.frameCount - 1, position));
    this.render(this.position);
    this.onStateChange();
  }

  next() { this.stop(); this.goTo(this.position + 1); }
  previous() { this.stop(); this.goTo(this.position - 1); }
}

// Formats numbers with thousands separators: 181440 -> "181,440"
function formatNumber(n) {
  return Number(n).toLocaleString('en-US');
}
