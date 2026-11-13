# FatFinger Cipher

**Try it:** https://tf13.github.io/fatfinger/

A Caesar-style cipher for the browser. Text is rewritten as if typed with your fingers shifted N keys left or right on a physical keyboard.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit + round-trip tests
npm run build    # static site in dist/
# Pushes to main deploy to GitHub Pages (.github/workflows/pages.yml)
```

## How it works
- **Physical keyboard** (`src/geometry.ts`): rows of `KeyboardEvent.code` keys for ANSI, ISO and JIS, each with a Mac or PC bottom row.
- **Layouts** (`src/layouts/`): what each key types at the base, Shift, AltGr and Shift+AltGr levels. 21 bundled layouts.
- **Engine** (`src/engine.ts`):
  - It finds each character's key, moves N keys along that row, and types the character at the same level.
  - Decrypting is the same shift in the opposite direction.
  - Characters not on the keyboard pass through unchanged.
- **Keys that type nothing** (Caps Lock, ⌥, Shift…):
  - **Skip & wrap** (default, reversible): only character keys count, and rows loop.
  - **Symbol** (reversible): writes `⟦⇪⟧`-style tokens, and rows loop.
  - **Realistic** (one-way): Caps Lock toggles case, Backspace deletes, and everything else types nothing.
- **Tab and Enter** type `\t` and `\n` by default, which can be turned off.
- **System keyboard** detection (`src/detect.ts`):
  - It uses `navigator.keyboard.getLayoutMap()` in Chromium browsers, and otherwise guesses from the browser language.
  - You can correct the layout by typing in "Teach FatFinger your keyboard".
- **Storage:** settings live in `localStorage` (`fatfinger.v1`). Your text is stored only if you opt in.

See `plans/PLAN.md` for the design and its open decisions.

## Command line & agent skill
```bash
npm run -s cli -- encrypt "Hello, world!"     # → Jr;;p. ept;f@
npm run -s cli -- --help
```
An agent skill describing how to use and change this project is in `.claude/skills/fatfinger/` (Claude Code) and `.agents/skills/fatfinger/` (other agents). Both are picked up automatically when you work in a clone of this repo.
