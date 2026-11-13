// Everything persists in localStorage under one key. All access is guarded:
// in private windows or with storage blocked the app still works, it just
// forgets settings on reload.
import type { Overrides } from './detect';
import type { Direction, Policy } from './engine';
import type { Form, Platform } from './geometry';

export interface Settings {
  mode: 'encrypt' | 'decrypt';
  direction: Direction;
  keys: number;
  /** 'system', 'custom', or a bundled layout id. */
  layoutId: string;
  form: Form | 'auto';
  platform: Platform | 'auto';
  policy: Policy;
  tabEnter: boolean;
  rememberText: boolean;
  text: string;
  /** Calibration: learned characters and the layout they were learned on top of. */
  custom: { baseId: string; overrides: Overrides } | null;
}

export const DEFAULTS: Settings = {
  mode: 'encrypt',
  direction: 'right',
  keys: 1,
  layoutId: 'system',
  form: 'auto',
  platform: 'auto',
  policy: 'skip',
  tabEnter: true,
  rememberText: false,
  text: '',
  custom: null,
};

const KEY = 'fatfinger.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const saved = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    const toSave: Settings = s.rememberText ? s : { ...s, text: '' };
    localStorage.setItem(KEY, JSON.stringify(toSave));
  } catch {
    // Storage unavailable — keep working in memory.
  }
}
