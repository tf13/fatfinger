// Command-line interface to the FatFinger engine, for scripts and agents.
// Run with:  npm run -s cli -- <command> [text] [options]
// (vite-node resolves the TypeScript sources directly; no build step.)
import { buildModel, decrypt, encrypt, land, transform, type Direction, type Policy } from '../src/engine';
import { getGeometry, type Form, type Platform } from '../src/geometry';
import { getLayout, LAYOUTS } from '../src/layouts';

const HELP = `FatFinger Cipher CLI

Usage: npm run -s cli -- <command> [text] [options]

Commands:
  encrypt [text]     Shift text as if typed with fingers moved on the keyboard
  decrypt [text]     Reverse it (not available with --policy realistic)
  shifts  [text]     Try 1..--max keys in both directions (decrypt direction by default)
  explain <chars>    Show where each character's key lands
  layouts            List layout ids

Text comes from the argument, or from stdin when no argument is given.
A single trailing newline on stdin is dropped unless --keep-newline is set.

Options:
  --dir left|right            default: right
  --keys N                    1-12, default: 1
  --layout ID                 default: us (see "layouts")
  --form auto|ansi|iso|jis    default: auto (ISO for layouts usually sold on ISO keyboards)
  --platform mac|pc           bottom row; default: this machine
  --policy skip|symbol|realistic   default: skip
  --no-tab-enter              Tab/Enter don't type \\t/\\n
  --max N                     for "shifts", default: 3
  --encrypt                   for "shifts": apply shifts in the encrypt direction
  --json                      machine-readable output
  --keep-newline              keep a trailing newline from stdin
`;

class UsageError extends Error {}

interface Opts {
  dir: Direction;
  keys: number;
  layout: string;
  form: Form | 'auto';
  platform: Platform;
  policy: Policy;
  tabEnter: boolean;
  max: number;
  encryptDir: boolean;
  json: boolean;
  keepNewline: boolean;
}

function oneOf<T extends string>(name: string, value: string | undefined, allowed: readonly T[]): T {
  if (value === undefined || !allowed.includes(value as T)) {
    throw new UsageError(`--${name} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

function intIn(name: string, value: string | undefined, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new UsageError(`--${name} must be an integer ${min}-${max}`);
  return n;
}

function parse(argv: string[]): { command: string; text?: string; opts: Opts } {
  const opts: Opts = {
    dir: 'right', keys: 1, layout: 'us', form: 'auto',
    platform: process.platform === 'darwin' ? 'mac' : 'pc',
    policy: 'skip', tabEnter: true, max: 3, encryptDir: false, json: false, keepNewline: false,
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--dir': opts.dir = oneOf('dir', next(), ['left', 'right'] as const); break;
      case '--keys': opts.keys = intIn('keys', next(), 1, 12); break;
      case '--layout': opts.layout = next() ?? ''; break;
      case '--form': opts.form = oneOf('form', next(), ['auto', 'ansi', 'iso', 'jis'] as const); break;
      case '--platform': opts.platform = oneOf('platform', next(), ['mac', 'pc'] as const); break;
      case '--policy': opts.policy = oneOf('policy', next(), ['skip', 'symbol', 'realistic'] as const); break;
      case '--no-tab-enter': opts.tabEnter = false; break;
      case '--max': opts.max = intIn('max', next(), 1, 12); break;
      case '--encrypt': opts.encryptDir = true; break;
      case '--json': opts.json = true; break;
      case '--keep-newline': opts.keepNewline = true; break;
      case '-h': case '--help': positional.unshift('help'); break;
      default:
        if (a.startsWith('--')) throw new UsageError(`Unknown option ${a}`);
        positional.push(a);
    }
  }
  if (!getLayout(opts.layout)) throw new UsageError(`Unknown layout "${opts.layout}". Run "layouts" to list them.`);
  return { command: positional[0] ?? 'help', text: positional[1], opts };
}

async function readText(arg: string | undefined, keepNewline: boolean): Promise<string> {
  if (arg !== undefined) return arg;
  if (process.stdin.isTTY) throw new UsageError('No text given (pass it as an argument or pipe it on stdin).');
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  return keepNewline ? text : text.replace(/\r?\n$/, '');
}

function setup(opts: Opts) {
  const layout = getLayout(opts.layout)!;
  const form: Form = opts.form === 'auto' ? (layout.prefersIso ? 'iso' : 'ansi') : opts.form;
  const model = buildModel(layout, getGeometry(form, opts.platform), { tabEnter: opts.tabEnter });
  return { layout, form, model };
}

function emit(text: string) {
  process.stdout.write(text + (process.stdout.isTTY ? '\n' : ''));
}

async function main() {
  const { command, text: arg, opts } = parse(process.argv.slice(2));
  const settings = { direction: opts.dir, keys: opts.keys, policy: opts.policy };

  switch (command) {
    case 'help':
      process.stdout.write(HELP);
      return;

    case 'layouts': {
      if (opts.json) {
        emit(JSON.stringify(LAYOUTS.map(({ id, name, group, prefersIso }) => ({ id, name, group, iso: prefersIso }))));
      } else {
        for (const l of LAYOUTS) console.log(`${l.id.padEnd(8)} ${l.name}${l.prefersIso ? '  (ISO)' : ''}`);
      }
      return;
    }

    case 'encrypt':
    case 'decrypt': {
      const { layout, form, model } = setup(opts);
      const input = await readText(arg, opts.keepNewline);
      if (command === 'decrypt' && opts.policy === 'realistic') {
        throw new UsageError('Realistic mode is one-way; it cannot be decrypted.');
      }
      const r = command === 'encrypt' ? encrypt(input, model, settings) : decrypt(input, model, settings);
      if (opts.json) {
        emit(JSON.stringify({
          text: r.text, unknown: r.unknown, dropped: r.dropped,
          settings: { ...settings, layout: layout.id, form, platform: opts.platform, tabEnter: opts.tabEnter },
        }));
      } else {
        emit(r.text);
        if (r.unknown) console.error(`note: ${r.unknown} character(s) not on this keyboard were left unchanged`);
        if (r.dropped) console.error(`note: ${r.dropped} keystroke(s) typed nothing`);
      }
      return;
    }

    case 'shifts': {
      if (opts.policy === 'realistic' && !opts.encryptDir) {
        throw new UsageError('Realistic mode is one-way; use --encrypt or another policy.');
      }
      const { model } = setup(opts);
      const input = await readText(arg, opts.keepNewline);
      const sign = opts.encryptDir ? 1 : -1;
      const rows: { dir: Direction; keys: number; text: string }[] = [];
      for (const dir of ['left', 'right'] as const) {
        for (let n = 1; n <= opts.max; n++) {
          const delta = sign * (dir === 'right' ? n : -n);
          rows.push({ dir, keys: n, text: transform(input, model, delta, opts.policy).text });
        }
      }
      if (opts.json) emit(JSON.stringify(rows));
      else for (const r of rows) console.log(`${r.dir.padEnd(5)} ${r.keys}\t${JSON.stringify(r.text)}`);
      return;
    }

    case 'explain': {
      const { model } = setup(opts);
      const input = await readText(arg, opts.keepNewline);
      const delta = opts.dir === 'right' ? opts.keys : -opts.keys;
      const out = Array.from(input).map((ch) => {
        const slot = model.lookup.get(ch);
        if (!slot) return { char: ch, key: null, lands: null, result: ch, note: 'not on this keyboard' };
        const l = land(model, slot, delta, opts.policy);
        const lands = l.kind === 'edge' ? 'edge' : l.code;
        const result = l.kind === 'char' ? l.text : l.kind === 'key' ? `⟦${model.labels.get(l.code)}⟧` : null;
        return { char: ch, key: slot.code, level: slot.level, lands, result };
      });
      if (opts.json) emit(JSON.stringify(out));
      else for (const o of out) console.log(`${JSON.stringify(o.char)} ${o.key ?? '-'} -> ${o.lands ?? '-'} ${JSON.stringify(o.result)}`);
      return;
    }

    default:
      throw new UsageError(`Unknown command "${command}"`);
  }
}

main().catch((e) => {
  console.error(e instanceof UsageError ? `error: ${e.message}\n\nRun with --help for usage.` : e);
  process.exit(e instanceof UsageError ? 2 : 1);
});
