# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla-JS Tetris (HTML5 Canvas + CSS). Three source files, no dependencies, no `package.json`, no build step, no tests, no linter. User-facing strings and the README are in Spanish — keep new UI text in Spanish.

## Running

```bash
open index.html          # macOS — works straight from the filesystem
python3 -m http.server 8000   # or any static server; then open http://localhost:8000
```

There is nothing to build, install, or test. Verifying a change means loading the page in a browser and playing.

## Architecture (`game.js`)

Single IIFE-less script in `'use strict'`, executed by `<script src="game.js">` at the end of `<body>`, so all `getElementById` lookups at module top-level are safe. Everything is module-scope: DOM handles are `const`s, all mutable game state is a single `let` declaration line (`board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`). There are no classes, no modules, no exports.

Key invariants to preserve when editing:

- **Piece type index doubles as color index.** `PIECES[n]` is filled with the literal value `n`, and `COLORS[n]` is that piece's color; both arrays are 1-based with `null` at index 0, and `0` in a board cell means empty. Adding or reordering a piece means touching both arrays consistently.
- **Canvas size is duplicated in HTML.** `#board` is `width="300" height="600"`, i.e. `COLS × BLOCK` by `ROWS × BLOCK`. Changing `COLS`/`ROWS`/`BLOCK` in `game.js` requires editing the attributes in `index.html`. `drawNext` also hardcodes a 4×4 preview grid at 30px against `#next-canvas` (120×120).
- **Rotation** is transpose-and-reverse (`rotateCW`) plus a simple wall-kick list `[0, -1, 1, -2, 2]` tried in order (`tryRotate`) — not the SRS kick tables.
- **`init()` is both boot and restart.** It resets every state variable, cancels the pending frame, and is wired to `restart-btn`. New state must be initialized there, not at declaration.
- **The loop owns exactly one pending frame** in `animId`. `togglePause` cancels it on pause and, on resume, resets `lastTime = performance.now()` before calling `loop` directly. Anything that stops or restarts the loop must keep `animId` and `lastTime` in sync or the game double-schedules frames / lurches on resume.
- **`clearLines` mutates `board` by splice/unshift** and compensates with `r++` after a removal — the loop runs bottom-up. Score uses `LINE_SCORES[cleared] * level`, level is `floor(lines / 10) + 1`, speed is `max(100, 1000 - (level - 1) * 90)` ms.
- **`ghostY()` is called both to draw the ghost each frame and to compute the hard-drop target**; it walks down with `collide` from the current position.
- `collide` intentionally allows negative `ny` (piece partly above the board) but rejects `ny >= ROWS` and any horizontal overflow. Game over is detected in `spawn()` when the freshly promoted piece already collides.

`index.html` supplies the fixed DOM contract (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`) — renaming an id requires updating the matching `const` in `game.js`. `style.css` is a dark/retro theme; the overlay is shown/hidden purely by toggling the `hidden` class.
