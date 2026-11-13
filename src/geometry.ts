// Physical keyboard geometry: which keys sit next to which, independent of
// what characters they type. Keys are identified by KeyboardEvent.code names
// (position-based, per the UI Events spec). Widths are in key units (1u).

export type Form = 'ansi' | 'iso' | 'jis';
export type Platform = 'mac' | 'pc';

/** A key in a row. `code: null` is a visual spacer (e.g. the top of an ISO Enter). */
export interface GeoKey {
  code: string | null;
  w: number;
}

export interface Geometry {
  form: Form;
  platform: Platform;
  rows: GeoKey[][];
}

const k = (code: string | null, w = 1): GeoKey => ({ code, w });
const keys = (codes: string[]): GeoKey[] => codes.map((c) => k(c));

const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
const TOP = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];
const HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
const BOTTOM = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'];

function mainRows(form: Form): GeoKey[][] {
  switch (form) {
    case 'ansi':
      return [
        [k('Backquote'), ...keys(DIGITS), k('Minus'), k('Equal'), k('Backspace', 2)],
        [k('Tab', 1.5), ...keys(TOP), k('Backslash', 1.5)],
        [k('CapsLock', 1.75), ...keys(HOME), k('Enter', 2.25)],
        [k('ShiftLeft', 2.25), ...keys(BOTTOM), k('ShiftRight', 2.75)],
      ];
    case 'iso':
      return [
        [k('Backquote'), ...keys(DIGITS), k('Minus'), k('Equal'), k('Backspace', 2)],
        [k('Tab', 1.5), ...keys(TOP), k(null, 1.5)],
        [k('CapsLock', 1.75), ...keys(HOME), k('Backslash'), k('Enter', 1.25)],
        [k('ShiftLeft', 1.25), k('IntlBackslash'), ...keys(BOTTOM), k('ShiftRight', 2.75)],
      ];
    case 'jis':
      return [
        [k('Backquote'), ...keys(DIGITS), k('Minus'), k('Equal'), k('IntlYen'), k('Backspace')],
        [k('Tab', 1.5), ...keys(TOP), k(null, 1.5)],
        [k('CapsLock', 1.75), ...keys(HOME), k('Backslash'), k('Enter', 1.25)],
        [k('ShiftLeft', 2.25), ...keys(BOTTOM), k('IntlRo'), k('ShiftRight', 1.75)],
      ];
  }
}

function bottomRow(form: Form, platform: Platform): GeoKey[] {
  if (platform === 'mac') {
    // Mac laptop: fn ⌃ ⌥ ⌘ [space] ⌘ ⌥ ← ↑↓ →
    if (form === 'jis') {
      return [k('Fn'), k('ControlLeft'), k('AltLeft'), k('MetaLeft', 1.25), k('Lang2', 1.25), k('Space', 4),
        k('Lang1', 1.25), k('MetaRight', 1.25), k('ArrowLeft'), k('ArrowDown'), k('ArrowRight')];
    }
    return [k('Fn'), k('ControlLeft'), k('AltLeft'), k('MetaLeft', 1.25), k('Space', 5.5),
      k('MetaRight', 1.25), k('AltRight'), k('ArrowLeft'), k('ArrowDown'), k('ArrowRight')];
  }
  if (form === 'jis') {
    return [k('ControlLeft', 1.25), k('MetaLeft', 1.25), k('AltLeft', 1.25), k('NonConvert', 1.25), k('Space', 3.75),
      k('Convert', 1.25), k('KanaMode', 1.25), k('AltRight', 1.25), k('ContextMenu', 1.25), k('ControlRight', 1.25)];
  }
  return [k('ControlLeft', 1.25), k('MetaLeft', 1.25), k('AltLeft', 1.25), k('Space', 6.25),
    k('AltRight', 1.25), k('MetaRight', 1.25), k('ContextMenu', 1.25), k('ControlRight', 1.25)];
}

export function getGeometry(form: Form, platform: Platform): Geometry {
  return { form, platform, rows: [...mainRows(form), bottomRow(form, platform)] };
}

/** Labels for keys that don't (normally) type a character. Used on the visual
 *  keyboard and inside ⟦…⟧ tokens, so each must be unique within a geometry. */
const COMMON_LABELS: Record<string, string> = {
  CapsLock: '⇪', ShiftLeft: 'L⇧', ShiftRight: 'R⇧', Tab: '⇥', Enter: '⏎', Backspace: '⌫',
  Space: '␣', Fn: 'fn', ArrowLeft: '←', ArrowDown: '↕', ArrowRight: '→', ContextMenu: '≣',
  IntlYen: '¥key', IntlRo: 'ろkey', Lang1: 'かな', Lang2: '英数', NonConvert: '無変換', Convert: '変換', KanaMode: 'カナ',
};
const MAC_LABELS: Record<string, string> = {
  ControlLeft: 'L⌃', ControlRight: 'R⌃', AltLeft: 'L⌥', AltRight: 'R⌥', MetaLeft: 'L⌘', MetaRight: 'R⌘',
};
const PC_LABELS: Record<string, string> = {
  ControlLeft: 'LCtrl', ControlRight: 'RCtrl', AltLeft: 'Alt', AltRight: 'AltGr', MetaLeft: 'LWin', MetaRight: 'RWin',
};

export function keyLabel(code: string, platform: Platform): string | undefined {
  return (platform === 'mac' ? MAC_LABELS : PC_LABELS)[code] ?? COMMON_LABELS[code];
}
