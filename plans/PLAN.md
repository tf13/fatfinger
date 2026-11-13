# Plan: FatFinger Cipher — keyboard-shift cipher (browser tool)

**Project location:** `~/Dropbox (Personal)/Coding-profl/fatfinger`. This plan is saved there as `plans/PLAN.md`.

**Decisions made:**
- Name: **FatFinger Cipher**.
- Non-printing keys: the recommended set from §4. **A (Skip & wrap)** is the default, and **B** and **C** are selectable.
- **Tab and Enter count as characters (`\t`, `\n`) by default**, so they are members of their rows' rings in every mode.

## Context
A Caesar-style cipher where the shift happens on a **physical keyboard**, not the alphabet: each character is replaced by the one you'd get if your hands were moved N keys left or right. It runs in the browser, encrypts and decrypts, supports many keyboard layouts (including non-English ones), and keeps settings only in `localStorage`. Defaults: **shift right, 1 key, system keyboard**. The design question that needs an answer is what to do when the target key doesn't type a character (Caps Lock, Option, Shift, Tab…). My recommendations are in §4.

The workspace is empty, so this is a new project with no code to reuse.

---

## 1. Core model: separate the physical keyboard from the layout
The key insight: "one key to the right" is a **physical** relationship. The character on that key comes from the **layout**. Model them separately:

- **Physical geometry** (form factor): the rows of keys, identified by the standard `KeyboardEvent.code` names (`KeyQ`, `Digit1`, `Semicolon`, `IntlBackslash`, `CapsLock`, `AltRight`…), in left-to-right order per row.
  - Variants: **ANSI**, **ISO** (extra `IntlBackslash` key next to left Shift, `Backslash` moved to the home row) and **JIS**. Each has a **Mac** or **PC** bottom row (Mac laptop: `fn, ⌃, ⌥, ⌘, Space, ⌘, ⌥` vs PC: `Ctrl, Win, Alt, Space, AltGr, Menu, Ctrl`).
  - Your example works with this model: Space → `MetaRight` (⌘) → `AltRight` (⌥) = 2 right of Space on a Mac laptop.
- **Logical layout**: a map from `code` to the characters at each modifier level: `{ base, shift, altgr?, altgrShift? }`. Keys with no character (modifiers, Caps Lock, Backspace) have no entry or are marked `nonPrintable`.

**Encode algorithm (per character):**
1. Reverse lookup: char → (`code`, level). Prefer the main block, ignore the numpad, and pick the lowest level if the char appears more than once.
2. Find that `code` in its physical row and move N positions in the chosen direction.
3. Output the target key's character at the **same level**. So `Q`→`W` and `!`→`@` (Shift+1 → Shift+2 on US).
4. Characters not on the layout (emoji, `é` on US QWERTY, CJK) **pass through unchanged** and are counted in a small "n characters not on this keyboard" notice.

**Decrypt** = encode with the opposite direction and the same N. This works exactly in the reversible modes (see §4).

Space is a normal key in the space-bar row. Tab and Enter are keys in their rows, typing `\t` and `\n`.
- `\r\n` is normalized to `\n` before processing.

## 2. "System keyboard" detection (the default)
Browsers only partly expose the layout, so detection is layered:
1. **`navigator.keyboard.getLayoutMap()`** (Chromium browsers, secure context): returns `code → base character` for the user's actual layout. Match it against the bundled layouts to find the closest one, and to pick ANSI or ISO (does `IntlBackslash` exist?).
2. **Calibrate by typing** (works in all browsers): a "Teach me your keyboard" box. As the user types, it records `e.code → e.key` with the shift/AltGr state, and builds or adjusts a custom layout. It's saved to localStorage as "My keyboard".
3. **Heuristic fallback**: `navigator.language` (de → QWERTZ, fr → AZERTY, ru → ЙЦУКЕН…) plus the platform (`navigator.userAgentData`/`platform`) for Mac vs PC.

The UI always shows what it resolved, e.g. *"System: German (QWERTZ), ISO, Mac — change"*, so a wrong guess is visible and easy to override.

## 3. Bundled layouts (v1)
Data-driven JSON, one file per layout, keyed by `code`:
- Latin: US QWERTY, UK, US-International, Dvorak, Colemak, German QWERTZ, Swiss German, French AZERTY, Belgian AZERTY, Spanish, Italian, Portuguese, Nordic (Swedish/Finnish, Norwegian, Danish), Turkish Q.
- Non-Latin: Russian ЙЦУКЕН, Ukrainian, Greek, Hebrew, Arabic.
- Data source: transcribe from CLDR keyboard data and the OS layout references, and check each against the OS keyboard viewer.
- **Dead keys** (e.g. `´` `^` on German or French) are treated as their spacing character. Composed characters (`é` typed as dead key + `e`) pass through in v1. A later option can decompose them (NFD) and shift both keystrokes.
- **Out of scope for v1:** layouts that need an IME (Japanese kana/romaji, Chinese, Korean 2-set). Their input isn't one key per character. Korean could be added later by decomposing jamo.
- Hebrew and Arabic use `dir="auto"` on the text areas.

## 4. Keys that don't type anything (the decision to make)
Options, from most to least reversible:

| Mode | Behavior | Reversible? |
|---|---|---|
| **A. Skip & wrap** *(recommended default)* | Each row's printable keys form a **ring**. Non-printable keys are skipped as if they weren't there, and moving past a row's end wraps to the other end (`a` 1-left → `'`, or the last printable key on the home row). | ✅ Always: it's a true per-row Caesar shift, and decryption is exact. N wraps modulo the row's printable count. |
| **B. Symbol tokens** | Output a visible glyph for the key you'd land on: `⇪` Caps Lock, `⌥` Option, `⇧` Shift, `⌘`, `⌃`, `⇥` Tab, `⏎` Enter, `⌫` Backspace, `fn`. Rows end with an "edge" glyph (`▯`). | ✅ If the input doesn't already contain those glyphs. Warn if it does. |
| **C. Realistic typing** | Simulate what would really happen: Caps Lock toggles case for later letters, Backspace deletes the previous output char, Tab → `\t`, Enter → newline, Shift/Option/⌘/fn → nothing (char dropped), edge of keyboard → nothing. | ❌ One-way. Decrypt is disabled and a "lossy" badge is shown. It's the most fun and closest to the premise. |
| D. Pass through | Leave the original character unchanged. | ⚠️ Can be ambiguous (e.g. `a` stays `a`, and `s` 1-left also → `a`). Warn about collisions. |
| E. Clamp at edge | Stop at the last printable key. | ❌ Collisions. Not recommended. Listed only for completeness. |

**Recommendation:** ship A (default), B and C as a "When the target key isn't a character" setting.
- **Decided:** Tab → `\t` and Enter → `\n` are printable ring members by default, in every mode. They can be turned off with the "Tab/Enter count as characters" toggle. With them on, `\t` and `\n` in the input are shifted like any other character, not passed through.
- Show which mode is reversible right next to the setting.

## 5. UI
Single page:
- **Encrypt / Decrypt** toggle, with a ⇄ button that swaps output into input and flips the mode.
- Input and output text areas with live updates, a Copy button, and the "not on keyboard" counter.
- Settings:
  - Direction: Left / **Right**.
  - Keys: number input, **1** by default, 1 to 12.
  - Keyboard: **System (detected …)** plus the bundled list and "My keyboard".
  - Physical form: Auto, ANSI, ISO or JIS, and Mac or PC.
  - Non-printable mode (§4).
- **Visual keyboard**: an SVG of the chosen geometry and layout showing the shift. Hovering a key highlights its source and target. Keys you'd land on that don't type anything are hatched, so the §4 policy is visible.
- **Optional "Try all shifts"** panel (decrypt helper): shows decryptions for left and right 1–3 at once, for when the settings are unknown.
- **Optional "Live typing"** mode: intercepts `keydown` and shifts by physical `e.code`, so it works even when the layout wasn't detected.
- Accessible: labelled controls, keyboard navigable, respects light and dark mode.

## 6. Storage
All in `localStorage` under one namespaced key (`fatfinger.v1`):
- settings,
- calibrated or custom layouts,
- last mode.

Every read and write is wrapped in try/catch, so the app works with storage blocked. No input text is stored unless an opt-in "remember last text" is on. Nothing leaves the browser.

## 7. Tech & structure
Vite + TypeScript, no framework, builds to static files. It can also be published as a single self-contained page.
```
src/
  geometry/   ansi.ts, iso.ts, jis.ts, mac-bottom.ts, pc-bottom.ts
  layouts/    us.json, de.json, fr.json, ru.json, …  (code → levels)
  engine.ts   buildIndex(layout, geometry), shiftChar, encode, decode, policies A–E
  detect.ts   getLayoutMap matching, calibration recorder, locale heuristic
  storage.ts  safe localStorage wrapper + schema version
  ui/         app.ts, keyboard-svg.ts, settings.ts
tests/        engine.test.ts, layouts.test.ts
```

## 8. Verification
- **Unit tests (Vitest)**:
  - Known pairs: US, right 1: `hello` → `jr;;p`, `Q`→`W`, `!`→`@`. Mac, Space right 2 → `⌥` in mode B.
  - **Round-trip property test**: in modes A and B, `decode(encode(s)) === s` for random strings, across every bundled layout, both directions, and N from 1 to 12.
- **Layout data tests**: every layout covers the alphanumeric keys, a character never appears twice at the same level without a declared preference, and the `code`s exist in the geometry.
- **Manual browser check** in Chrome (getLayoutMap path), Safari and Firefox (calibration and fallback path):
  - detection label is correct,
  - the visual keyboard matches the OS keyboard viewer for US, German, French and Russian,
  - settings persist across reloads,
  - the app still works in a private window.

---

## Implementation notes (v0.1, as built)
What changed from the plan above:
- **Symbol mode wraps** at row edges instead of writing an edge glyph. Tokens look like `⟦⇪⟧` or `⟦R⌥⟧`. A shift-level prefix is added when needed, e.g. `⟦⇧+⇪⟧`, so shifted characters decrypt back to the right case. Tokens are parsed in both directions, so encrypting twice and decrypting twice still round-trips.
- **De-duplication:** if a layout types the same character on two keys or levels, only the first is kept (lowest level, then top-left). This guarantees decryption is unambiguous.
- **Normalization:** plaintext is NFC-normalized before encrypting. Ciphertext is never normalized, because NFC reorders stacked combining marks such as Arabic harakat.
- **Space** is the only character key in its row, so in Skip & wrap mode it never changes. It shifts in Symbol mode (e.g. Mac, right 2 → `⟦R⌥⟧`) and in Realistic mode.
- **Unique characters:** layouts whose keys type two characters (the Arabic lam-alef keys) leave those keys blank.
- **AltGr layers** follow Windows conventions. The Mac ⌥ layer isn't modeled. "Teach FatFinger your keyboard" records ⌥ characters on a Mac.
- **Deferred:** the "Live typing" mode, NFD decomposition of dead-key compositions, and IME layouts (CJK).
