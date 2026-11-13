// Figuring out the "system keyboard". Browsers expose only part of it, so:
//   1. navigator.keyboard.getLayoutMap() (Chromium, secure context)
//   2. the user's own calibration (see Calibrator)
//   3. navigator.language as a fallback guess
import type { Platform } from './geometry';
import { LAYOUTS, type KeyChars, type Layout, type Level } from './layouts';

export type DetectSource = 'keyboard-api' | 'language' | 'default';

export interface Detection {
  layoutId: string;
  source: DetectSource;
}

export function detectPlatform(): Platform {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const p = nav.userAgentData?.platform || navigator.platform || navigator.userAgent;
  return /mac|iphone|ipad/i.test(p) ? 'mac' : 'pc';
}

const LANGUAGE_MAP: Record<string, string> = {
  'en-gb': 'uk', 'en-ie': 'uk', en: 'us',
  'de-ch': 'ch-de', de: 'de', 'fr-be': 'be', 'nl-be': 'be', fr: 'fr',
  es: 'es', it: 'it', pt: 'pt', 'pt-br': 'us-intl',
  sv: 'se', fi: 'se', nb: 'no', nn: 'no', no: 'no', da: 'dk', tr: 'tr',
  ru: 'ru', uk: 'ua', el: 'gr', he: 'he', iw: 'he', ar: 'ar',
};

export function layoutFromLanguage(lang: string): string | undefined {
  const l = lang.toLowerCase();
  return LANGUAGE_MAP[l] ?? LANGUAGE_MAP[l.split('-')[0]];
}

/** Score bundled layouts against a code→char map; returns the best match. */
export function matchLayoutMap(map: Map<string, string>): { id: string; score: number } {
  let best = { id: 'us', score: -1 };
  for (const layout of LAYOUTS) {
    let score = 0;
    for (const [code, chars] of Object.entries(layout.keys)) {
      const sys = map.get(code);
      if (sys !== undefined && chars[0] !== null && sys.toLowerCase() === chars[0].toLowerCase()) score++;
    }
    if (score > best.score) best = { id: layout.id, score };
  }
  return best;
}

export async function detectSystemLayout(): Promise<Detection> {
  const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
  if (kb?.getLayoutMap) {
    try {
      const map = await kb.getLayoutMap();
      if (map.size > 0) {
        const { id, score } = matchLayoutMap(map);
        if (score >= 30) return { layoutId: id, source: 'keyboard-api' };
      }
    } catch {
      // Not allowed here (e.g. inside an iframe) — fall through.
    }
  }
  return detectFromLanguage();
}

export function detectFromLanguage(): Detection {
  for (const lang of navigator.languages ?? [navigator.language]) {
    const id = layoutFromLanguage(lang);
    if (id) return { layoutId: id, source: 'language' };
  }
  return { layoutId: 'us', source: 'default' };
}

/** Learned key → character overrides, stored per level. */
export type Overrides = Record<string, KeyChars>;

/** Build a layout from a base layout plus learned characters. */
export function applyOverrides(base: Layout, overrides: Overrides, name = 'My keyboard'): Layout {
  const keys: Record<string, KeyChars> = {};
  for (const [code, chars] of Object.entries(base.keys)) keys[code] = [...chars];
  for (const [code, chars] of Object.entries(overrides)) {
    const k: KeyChars = keys[code] ?? [null, null, null, null];
    chars.forEach((ch, i) => {
      if (ch !== null) k[i] = ch;
    });
    keys[code] = k;
  }
  // A learned character replaces wherever the base layout had it.
  const learned = new Map<string, string>();
  for (const [code, chars] of Object.entries(overrides)) {
    chars.forEach((ch, i) => ch && learned.set(ch, `${code}:${i}`));
  }
  for (const [code, chars] of Object.entries(keys)) {
    chars.forEach((ch, i) => {
      if (ch && learned.has(ch) && learned.get(ch) !== `${code}:${i}`) chars[i] = null;
    });
  }
  return { ...base, id: 'custom', name, keys };
}

const CALIBRATABLE = /^(Backquote|Digit\d|Minus|Equal|Key[A-Z]|Bracket(Left|Right)|Backslash|Semicolon|Quote|IntlBackslash|IntlRo|IntlYen|Comma|Period|Slash)$/;

/** Record one keydown into `overrides`. Returns true if something was learned. */
export function learnKey(e: KeyboardEvent, platform: Platform, overrides: Overrides): boolean {
  if (!CALIBRATABLE.test(e.code) || e.ctrlKey || e.metaKey) return false;
  if (Array.from(e.key).length !== 1) return false; // 'Dead', 'Unidentified', …
  const altgr = e.getModifierState('AltGraph') || (platform === 'mac' && e.altKey);
  const level = ((e.shiftKey ? 1 : 0) + (altgr ? 2 : 0)) as Level;
  const k = (overrides[e.code] ??= [null, null, null, null]);
  if (k[level] === e.key) return false;
  k[level] = e.key;
  return true;
}
