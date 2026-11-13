// FatFinger Cipher engine: shift each character N physical keys left/right.
import { keyLabel, type Geometry } from './geometry';
import type { KeyChars, Layout, Level } from './layouts/types';

/**
 * What happens when the shifted finger lands on a key that types nothing:
 *  - skip:      only character keys exist; rows wrap around (always reversible)
 *  - symbol:    the key is written as a ⟦token⟧; rows wrap (reversible)
 *  - realistic: simulate it — Caps Lock toggles case, Backspace deletes,
 *               modifiers and the keyboard edge type nothing (one-way)
 */
export type Policy = 'skip' | 'symbol' | 'realistic';
export type Direction = 'left' | 'right';

export interface Slot {
  code: string;
  level: Level;
}

export interface Model {
  /** Key codes per physical row (spacers removed). */
  rows: string[][];
  where: Map<string, { row: number; col: number }>;
  /** Effective characters per key after de-duplication. */
  chars: Map<string, KeyChars>;
  /** Character → the single key/level that types it. */
  lookup: Map<string, Slot>;
  /** Per row, per level: the keys that type something at that level. */
  rings: string[][][];
  labels: Map<string, string>;
  /** ⟦token⟧ text → slot, for symbol mode. */
  tokens: Map<string, Slot>;
}

export interface ModelOptions {
  /** Tab types "\t" and Enter types "\n" (they become ordinary character keys). */
  tabEnter: boolean;
}

const LEVEL_PREFIX = ['', '⇧+', 'AltGr+', '⇧+AltGr+'];
export const TOKEN_OPEN = '⟦';
export const TOKEN_CLOSE = '⟧';

const EMPTY: KeyChars = [null, null, null, null];

export function buildModel(layout: Layout, geometry: Geometry, opts: ModelOptions): Model {
  const rows = geometry.rows.map((r) => r.map((k) => k.code).filter((c): c is string => c !== null));
  const where = new Map<string, { row: number; col: number }>();
  rows.forEach((codes, row) => codes.forEach((code, col) => where.set(code, { row, col })));

  const raw = new Map<string, KeyChars>();
  for (const code of where.keys()) {
    const chars: KeyChars = [...(layout.keys[code] ?? EMPTY)];
    if (code === 'Space') chars[0] = ' ';
    if (opts.tabEnter && code === 'Tab') chars[0] = '\t';
    if (opts.tabEnter && code === 'Enter') chars[0] = '\n';
    raw.set(code, chars);
  }

  // Each character must belong to exactly one key/level or decryption becomes
  // ambiguous. Keep the first occurrence (lowest level, then top-left first).
  const lookup = new Map<string, Slot>();
  const chars = new Map<string, KeyChars>();
  for (const code of where.keys()) chars.set(code, [null, null, null, null]);
  for (let level = 0 as Level; level < 4; level = (level + 1) as Level) {
    for (const codes of rows) {
      for (const code of codes) {
        const ch = raw.get(code)![level];
        if (ch && !lookup.has(ch)) {
          lookup.set(ch, { code, level });
          chars.get(code)![level] = ch;
        }
      }
    }
  }

  const rings = rows.map((codes) =>
    [0, 1, 2, 3].map((level) => codes.filter((c) => chars.get(c)![level] !== null)),
  );

  const labels = new Map<string, string>();
  const used = new Set<string>();
  for (const code of where.keys()) {
    let label = keyLabel(code, geometry.platform) ?? raw.get(code)![0] ?? code;
    if (used.has(label)) label = code;
    used.add(label);
    labels.set(code, label);
  }

  const tokens = new Map<string, Slot>();
  for (const [code, kc] of chars) {
    kc.forEach((ch, level) => {
      if (ch === null) tokens.set(tokenText(labels.get(code)!, level as Level), { code, level: level as Level });
    });
  }

  return { rows, where, chars, lookup, rings, labels, tokens };
}

function tokenText(label: string, level: Level): string {
  return TOKEN_OPEN + LEVEL_PREFIX[level] + label + TOKEN_CLOSE;
}

export function charAt(model: Model, code: string, level: Level): string | null {
  return model.chars.get(code)?.[level] ?? null;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export type Landing =
  | { kind: 'char'; code: string; text: string }
  | { kind: 'key'; code: string } // a key with no character at this level
  | { kind: 'edge' }; // fell off the keyboard (realistic mode only)

/** Where a finger on `slot` lands after moving `delta` keys (negative = left). */
export function land(model: Model, slot: Slot, delta: number, policy: Policy): Landing {
  const { row, col } = model.where.get(slot.code)!;
  let target: string;
  if (policy === 'skip') {
    const ring = model.rings[row][slot.level];
    target = ring[mod(ring.indexOf(slot.code) + delta, ring.length)];
  } else {
    const codes = model.rows[row];
    const j = col + delta;
    if (policy === 'realistic' && (j < 0 || j >= codes.length)) return { kind: 'edge' };
    target = codes[mod(j, codes.length)];
  }
  const text = charAt(model, target, slot.level);
  return text !== null ? { kind: 'char', code: target, text } : { kind: 'key', code: target };
}

export interface Result {
  text: string;
  /** Characters that aren't on this keyboard and were left unchanged. */
  unknown: number;
  /** Realistic mode: keystrokes that typed nothing (modifiers, edges). */
  dropped: number;
  /** Input contained ⟦…⟧ tokens in symbol mode. */
  hadTokens: boolean;
}

type Unit = { slot: Slot } | { literal: string };

function tokenize(text: string, model: Model, parseTokens: boolean): { units: Unit[]; hadTokens: boolean } {
  const units: Unit[] = [];
  const cps = Array.from(text);
  let hadTokens = false;
  for (let i = 0; i < cps.length; i++) {
    const ch = cps[i];
    if (parseTokens && ch === TOKEN_OPEN) {
      const close = cps.indexOf(TOKEN_CLOSE, i + 1);
      if (close > i && close - i <= 24) {
        const slot = model.tokens.get(cps.slice(i, close + 1).join(''));
        if (slot) {
          units.push({ slot });
          hadTokens = true;
          i = close;
          continue;
        }
      }
    }
    const slot = model.lookup.get(ch);
    units.push(slot ? { slot } : { literal: ch });
  }
  return { units, hadTokens };
}

/** Line endings only. Unicode normalization is applied to plaintext before
 *  encrypting (see encrypt) but never to ciphertext: NFC may reorder stacked
 *  combining marks (e.g. Arabic harakat), which would break decryption. */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

const isQuietLiteral = (ch: string) => ch === '\n' || ch === '\t' || ch === '\r';

function swapCase(ch: string): string {
  const up = ch.toUpperCase();
  const low = ch.toLowerCase();
  if (up === low) return ch;
  const swapped = ch === up ? low : up;
  return Array.from(swapped).length === 1 ? swapped : ch;
}

/** Shift every character by `delta` keys. Decrypting is the same call with -delta. */
export function transform(input: string, model: Model, delta: number, policy: Policy): Result {
  const { units, hadTokens } = tokenize(normalizeNewlines(input), model, policy === 'symbol');
  const out: string[] = [];
  let unknown = 0;
  let dropped = 0;
  let caps = false;

  for (const u of units) {
    if ('literal' in u) {
      out.push(u.literal);
      if (!isQuietLiteral(u.literal)) unknown++;
      continue;
    }
    const l = land(model, u.slot, delta, policy);
    if (l.kind === 'char') {
      out.push(policy === 'realistic' && caps ? swapCase(l.text) : l.text);
    } else if (policy === 'symbol' && l.kind === 'key') {
      out.push(tokenText(model.labels.get(l.code)!, u.slot.level));
    } else if (l.kind === 'key' && l.code === 'CapsLock') {
      caps = !caps;
    } else if (l.kind === 'key' && l.code === 'Backspace') {
      out.pop();
    } else if (l.kind === 'key' && l.code === 'Tab') {
      out.push('\t');
    } else if (l.kind === 'key' && l.code === 'Enter') {
      out.push('\n');
    } else {
      dropped++;
    }
  }
  return { text: out.join(''), unknown, dropped, hadTokens };
}

export interface CipherSettings {
  direction: Direction;
  keys: number;
  policy: Policy;
}

export const deltaOf = (s: Pick<CipherSettings, 'direction' | 'keys'>) =>
  s.direction === 'right' ? s.keys : -s.keys;

export function encrypt(text: string, model: Model, s: CipherSettings): Result {
  return transform(text.normalize('NFC'), model, deltaOf(s), s.policy);
}

export function decrypt(text: string, model: Model, s: CipherSettings): Result {
  if (s.policy === 'realistic') throw new Error('Realistic mode is one-way and cannot be decrypted.');
  return transform(text, model, -deltaOf(s), s.policy);
}
