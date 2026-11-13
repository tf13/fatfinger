import { buildModel, decrypt, encrypt, type CipherSettings, type Policy } from '../src/engine';
import { getGeometry, type Form, type Platform } from '../src/geometry';
import { getLayout, LAYOUTS } from '../src/layouts';

const us = getLayout('us')!;
const model = (opts: { form?: Form; platform?: Platform; tabEnter?: boolean; layout?: string } = {}) =>
  buildModel(getLayout(opts.layout ?? 'us')!, getGeometry(opts.form ?? 'ansi', opts.platform ?? 'mac'), {
    tabEnter: opts.tabEnter ?? true,
  });
const R1: CipherSettings = { direction: 'right', keys: 1, policy: 'skip' };

describe('known pairs (US, ANSI)', () => {
  it('shifts one key right', () => {
    expect(encrypt('hello', model(), R1).text).toBe('jr;;p');
    expect(encrypt('Q!', model(), R1).text).toBe('W@');
  });

  it('keeps the shift level', () => {
    expect(encrypt('HELLO', model(), R1).text).toBe('JR::P');
  });

  it('wraps rows in skip mode, with Tab/Enter as characters', () => {
    const m = model();
    expect(encrypt('a', m, { ...R1, direction: 'left' }).text).toBe('\n');
    expect(encrypt('\\', m, R1).text).toBe('\t');
    expect(encrypt('\n', m, R1).text).toBe('a');
  });

  it('wraps past Tab/Enter when they are not characters', () => {
    const m = model({ tabEnter: false });
    expect(encrypt('a', m, { ...R1, direction: 'left' }).text).toBe("'");
    expect(encrypt('\\', m, R1).text).toBe('q');
  });

  it('leaves space alone in skip mode (only printable key in its row)', () => {
    expect(encrypt('a b', model(), R1).text).toBe('s n');
  });

  it('passes through characters not on the keyboard and counts them', () => {
    const r = encrypt('é😀a', model(), R1);
    expect(r.text).toBe('é😀s');
    expect(r.unknown).toBe(2);
  });
});

describe('symbol mode', () => {
  const S: CipherSettings = { direction: 'right', keys: 2, policy: 'symbol' };

  it('lands on Option two keys right of Space on a Mac (user example)', () => {
    expect(encrypt(' ', model({ platform: 'mac' }), S).text).toBe('⟦R⌥⟧');
  });

  it('writes Caps Lock one key left of a', () => {
    expect(encrypt('a', model(), { ...S, keys: 1, direction: 'left' }).text).toBe('⟦⇪⟧');
    expect(encrypt('A', model(), { ...S, keys: 1, direction: 'left' }).text).toBe('⟦⇧+⇪⟧');
  });

  it('decrypts tokens back', () => {
    const m = model();
    const enc = encrypt('a quiet zebra', m, S);
    expect(decrypt(enc.text, m, S).text).toBe('a quiet zebra');
  });
});

describe('realistic mode', () => {
  const L1: CipherSettings = { direction: 'left', keys: 1, policy: 'realistic' };

  it('toggles caps when landing on Caps Lock', () => {
    // a→Caps Lock (on), s→a (shown as A), d→s (S)
    expect(encrypt('asd', model(), L1).text).toBe('AS');
  });

  it('deletes with Backspace and drops modifiers / edges', () => {
    const R: CipherSettings = { direction: 'right', keys: 1, policy: 'realistic' };
    // 1→2, = →Backspace deletes it
    expect(encrypt('1=', model(), R).text).toBe('');
    const r = encrypt('/', model(), R); // → right Shift
    expect(r.text).toBe('');
    expect(r.dropped).toBe(1);
  });

  it('refuses to decrypt', () => {
    expect(() => decrypt('x', model(), L1)).toThrow();
  });
});

// Deterministic PRNG so failures are reproducible.
function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

describe('round trip: decrypt(encrypt(s)) === s', () => {
  const policies: Policy[] = ['skip', 'symbol'];
  const forms: Form[] = ['ansi', 'iso', 'jis'];
  const platforms: Platform[] = ['mac', 'pc'];

  for (const layout of LAYOUTS) {
    it(layout.id, () => {
      const rand = rng(layout.id.length * 7919);
      for (const form of forms) {
        for (const platform of platforms) {
          for (const tabEnter of [true, false]) {
            const m = buildModel(layout, getGeometry(form, platform), { tabEnter });
            const alphabet = [...m.lookup.keys(), 'é', '😀', '\n', '\t', '中'];
            const text = Array.from({ length: 120 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join('').normalize('NFC');
            for (const policy of policies) {
              for (const direction of ['left', 'right'] as const) {
                for (let keys = 1; keys <= 12; keys++) {
                  const s = { direction, keys, policy };
                  const enc = encrypt(text, m, s).text;
                  const dec = decrypt(enc, m, s).text;
                  if (dec !== text) {
                    throw new Error(`${layout.id} ${form}/${platform} tabEnter=${tabEnter} ${policy} ${direction}${keys} failed`);
                  }
                }
              }
            }
          }
        }
      }
    });
  }
});

it('US layout is exported', () => expect(us.name).toContain('US'));
