---
name: fatfinger
description: Encrypt, decrypt or crack text with FatFinger Cipher, a Caesar-style cipher that rewrites text as if typed with your fingers shifted N keys left or right on a physical keyboard (QWERTY, AZERTY, QWERTZ, Dvorak, Russian, Greek, Hebrew, Arabic and more). Use when asked to fat-finger or keyboard-shift text, to decode gibberish that looks like typing with misplaced hands (e.g. "Jr;;p" for "Hello"), or to run, test, or change the FatFinger repo.
---

# FatFinger Cipher

FatFinger shifts each character to the key N positions left or right **on the physical keyboard**, then types the character on that key. It keeps the same Shift/AltGr level, so `Q`→`W` and `!`→`@` on US QWERTY, shifting right by 1. Decrypting is the same shift in the opposite direction.

## Find the project

The project is the folder whose `package.json` has `"name": "fatfinger-cipher"`. If you're not in it, look at `$FATFINGER_DIR`, then ask the user where it is.

Run `npm install` once if `node_modules/` is missing. Everything below runs from the project root.

## Encrypt / decrypt from the command line

```bash
npm run -s cli -- encrypt "Hello, world!"            # → Jr;;p. ept;f@
npm run -s cli -- decrypt "Jr;;p. ept;f@"            # → Hello, world!
npm run -s cli -- encrypt "Grüße" --layout de --dir left --keys 2
echo "some text" | npm run -s cli -- encrypt --json  # text from stdin
```

Always pass `-s` so npm's own output doesn't get mixed into the result.

| Option | Values | Default |
|---|---|---|
| `--dir` | `left`, `right` | `right` |
| `--keys` | 1–12 | `1` |
| `--layout` | an id from `npm run -s cli -- layouts` | `us` |
| `--form` | `auto`, `ansi`, `iso`, `jis` (physical keyboard) | `auto`: ISO for layouts usually sold on ISO keyboards (de, fr, uk…), otherwise ANSI |
| `--platform` | `mac`, `pc` (bottom row: fn ⌃ ⌥ ⌘ or Ctrl Win Alt) | this machine |
| `--policy` | `skip`, `symbol`, `realistic` | `skip` |
| `--no-tab-enter` | Tab/Enter stop typing `\t`/`\n` | they type them |
| `--json` | output `{text, unknown, dropped, settings}` | off |
| `--keep-newline` | keep stdin's trailing newline | dropped |

**Both sides must use identical settings:** direction, keys, layout, form, platform, policy and tab/enter. The defaults for `--form` and `--platform` depend on the layout and the machine, so when sharing ciphertext, state them explicitly or copy `settings` from the `--json` output.

The browser app's default layout is "system keyboard". The CLI has no system detection and defaults to `us`.

### Keys that type nothing (`--policy`)
- `skip` (reversible): only character keys exist, and each row wraps around. One left of `a` is `\n`, or `'` with `--no-tab-enter`. **Space never changes**, because it's the only character key in its row.
- `symbol` (reversible): landing on a non-character key writes a token such as `⟦⇪⟧`, `⟦R⌥⟧` or `⟦⇧+⇪⟧`. Rows wrap. Example: Space, 2 right, Mac → `⟦R⌥⟧`.
- `realistic` (one-way): Caps Lock toggles case, Backspace deletes, Tab/Enter type `\t`/`\n`, and modifiers or going off the edge type nothing. `decrypt` exits with code 2.

### Other behavior to know
- Characters not on the chosen layout (emoji, `é` on US…) pass through unchanged. They're counted in `unknown` and reported on stderr.
- Plaintext is NFC-normalized before encrypting. Ciphertext is never normalized.
- Plain output has no trailing newline when piped. Use `--json` when the exact text matters, especially with tabs or newlines.
- Exit codes: `0` ok, `2` usage error (unknown layout or option, decrypting realistic), `1` unexpected error.

## Crack text with unknown settings

```bash
npm run -s cli -- shifts "Jr;;p. ept;f@"                 # tries left/right 1..3 (decrypt direction)
npm run -s cli -- shifts "…" --max 5 --layout fr --json
```

Each row is labeled with the setting that would have **encrypted** the plaintext. Pick the row that reads as natural language. If nothing does, try other `--layout`, `--form`, `--policy` or `--no-tab-enter` values. Clues:
- Lots of `⟦…⟧` tokens means `--policy symbol`.
- Unexpected line breaks or tabs mean Tab/Enter were characters.
- Space characters left in place suggest `skip`.

## See where a key lands

```bash
npm run -s cli -- explain " a" --policy symbol --keys 2 --platform mac --json
# [{"char":" ","key":"Space","lands":"AltRight","result":"⟦R⌥⟧"}, {"char":"a","key":"KeyA","lands":"KeyD","result":"d"}]
```

## Browser app

```bash
npm run dev     # Vite dev server, http://localhost:5173
npm run build   # static site in dist/
```

The app has:
- live encrypt/decrypt and a keyboard map,
- "Try all shifts",
- "Teach FatFinger your keyboard" calibration,
- system-layout detection (`navigator.keyboard.getLayoutMap()` in Chromium, otherwise a guess from the browser language).

Settings are kept in `localStorage` under the key `fatfinger.v1`.

## Working on the code

| Path | What it holds |
|---|---|
| `src/engine.ts` | `buildModel`, `land`, `transform`, `encrypt`, `decrypt` and the policies |
| `src/geometry.ts` | Physical rows by `KeyboardEvent.code` for ANSI/ISO/JIS × Mac/PC, plus key labels used in tokens |
| `src/layouts/` | Layout data. Each row is a string, split by code point; `␀` means nothing at that level. Rows: `` ` ``1–0 `-` `=` (13), Q…`]` `\` (13), A…`'` (11), ISO key Z…`/` (11). Levels: base, shift, altgr, altgrShift. |
| `src/detect.ts` | System-layout detection and calibration |
| `src/storage.ts` | Saved settings |
| `src/main.ts`, `src/ui/` | The browser UI |
| `scripts/fatfinger.ts` | This CLI |
| `plans/PLAN.md` | Design and decisions |

- `npm test` runs the unit tests plus a round-trip check over every layout × form × platform × policy × 1–12 keys. `npm run build` also type-checks.
- **Adding a layout:** add a `LayoutDef` to `src/layouts/latin.ts` or `nonlatin.ts`. Set `iso: true` if the layout is usually sold on ISO keyboards. Then run `npm test`: the tests catch wrong row lengths, characters repeated at base/shift level, and missing letter keys.
- **Use `\u` escapes for unusual character pairs** in layout strings. Some editors merge pairs like `Ñ¨` into a single character.
- **Every character must map to exactly one key and level,** or decryption becomes ambiguous. The engine keeps the first occurrence; keep that invariant.
