// Logical layouts: which character each physical key types at each level.

/** 0 = base, 1 = Shift, 2 = AltGr (⌥ on Mac), 3 = Shift+AltGr */
export type Level = 0 | 1 | 2 | 3;
export type KeyChars = [string | null, string | null, string | null, string | null];

export interface Layout {
  id: string;
  name: string;
  group: string;
  /** Usually sold on ISO hardware (extra key left of Z). Drives "Auto" form. */
  prefersIso: boolean;
  keys: Record<string, KeyChars>;
}

/** The 48 character-key positions shared by ANSI/ISO/JIS, in four row groups. */
export const ROW_CODES: string[][] = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];

/** Marks "no character at this level" inside compact row strings. */
export const NONE = '␀';

/** A row is a string (split by code point) or an explicit array (for combining marks). */
type Row = string | string[];
type Rows = [Row, Row, Row, Row];

export interface LayoutDef {
  id: string;
  name: string;
  group: string;
  iso?: boolean;
  base: Rows;
  shift: Rows;
  altgr?: Rows;
  altgrShift?: Rows;
}

function split(row: Row): string[] {
  return typeof row === 'string' ? Array.from(row) : row;
}

export function compileLayout(def: LayoutDef): Layout {
  const levels = [def.base, def.shift, def.altgr, def.altgrShift];
  const keys: Record<string, KeyChars> = {};
  ROW_CODES.forEach((codes, r) => {
    codes.forEach((code) => (keys[code] = [null, null, null, null]));
    levels.forEach((rows, level) => {
      if (!rows) return;
      const chars = split(rows[r]);
      if (chars.length !== codes.length) {
        throw new Error(`${def.id}: level ${level} row ${r} has ${chars.length} keys, expected ${codes.length}`);
      }
      chars.forEach((ch, i) => {
        if (ch !== NONE && ch !== '') keys[codes[i]][level] = ch;
      });
    });
  });
  return { id: def.id, name: def.name, group: def.group, prefersIso: !!def.iso, keys };
}
