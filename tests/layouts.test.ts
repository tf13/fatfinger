import { getGeometry } from '../src/geometry';
import { LAYOUTS, ROW_CODES } from '../src/layouts';

const LETTER_CODES = [
  ...ROW_CODES[1].slice(0, 10),
  ...ROW_CODES[2].slice(0, 9),
  ...ROW_CODES[3].slice(1, 8),
  ...ROW_CODES[0].slice(1, 11),
];
const geometryCodes = new Set(
  (['ansi', 'iso', 'jis'] as const).flatMap((f) => getGeometry(f, 'pc').rows.flat().map((k) => k.code)),
);

describe.each(LAYOUTS.map((l) => [l.id, l] as const))('%s', (_id, layout) => {
  it('defines a base character for every letter and digit key', () => {
    // Arabic B types the two-character lam-alef ligature, which we can't represent.
    const exempt = layout.id === 'ar' ? ['KeyB'] : [];
    for (const code of LETTER_CODES) if (!exempt.includes(code)) expect(layout.keys[code]?.[0], code).toBeTruthy();
  });

  it('never types the same character twice at base/shift level', () => {
    const seen = new Map<string, string>();
    for (const [code, chars] of Object.entries(layout.keys)) {
      for (const ch of chars.slice(0, 2)) {
        if (!ch) continue;
        expect(seen.get(ch), `"${ch}" on ${code} and ${seen.get(ch)}`).toBeUndefined();
        seen.set(ch, code);
      }
    }
  });

  it('only uses key codes that exist in some geometry', () => {
    for (const code of Object.keys(layout.keys)) expect(geometryCodes.has(code), code).toBe(true);
  });

  it('uses one code point per key', () => {
    for (const chars of Object.values(layout.keys)) {
      for (const ch of chars) if (ch) expect(Array.from(ch)).toHaveLength(1);
    }
  });
});

it('every row is 15 units wide', () => {
  for (const form of ['ansi', 'iso', 'jis'] as const) {
    for (const platform of ['mac', 'pc'] as const) {
      for (const row of getGeometry(form, platform).rows) {
        expect(row.reduce((s, k) => s + k.w, 0), `${form}/${platform}`).toBeCloseTo(15);
      }
    }
  }
});
