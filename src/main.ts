import './style.css';
import {
  applyOverrides, detectFromLanguage, detectPlatform, detectSystemLayout, learnKey,
  type Detection, type Overrides,
} from './detect';
import { buildModel, deltaOf, transform, type Direction, type Policy } from './engine';
import { getGeometry, type Form, type Platform } from './geometry';
import { getLayout, LAYOUTS, type Layout } from './layouts';
import { loadSettings, saveSettings, type Settings } from './storage';
import { createKeyboard } from './ui/keyboard';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const state: Settings = loadSettings();
let detection: Detection = detectFromLanguage();
const detectedPlatform = detectPlatform();
let calib: Overrides = structuredClone(state.custom?.overrides ?? {});

const input = $<HTMLTextAreaElement>('input');
const output = $<HTMLTextAreaElement>('output');
const notes = $('notes');
const layoutSel = $<HTMLSelectElement>('layout');
const keysInput = $<HTMLInputElement>('keys');
const keyboard = createKeyboard($('kbd'), $('kbd-caption'));

const SOURCE_TEXT: Record<Detection['source'], string> = {
  'keyboard-api': 'detected from your keyboard',
  language: 'guessed from your browser language',
  default: 'default guess',
};

function resolveLayout(): Layout {
  const fallback = getLayout('us')!;
  if (state.layoutId === 'system') return getLayout(detection.layoutId) ?? fallback;
  if (state.layoutId === 'custom' && state.custom) {
    return applyOverrides(getLayout(state.custom.baseId) ?? fallback, state.custom.overrides);
  }
  return getLayout(state.layoutId) ?? fallback;
}

function resolve() {
  const layout = resolveLayout();
  const form: Form = state.form === 'auto' ? (layout.prefersIso ? 'iso' : 'ansi') : state.form;
  const platform: Platform = state.platform === 'auto' ? detectedPlatform : state.platform;
  const geometry = getGeometry(form, platform);
  const model = buildModel(layout, geometry, { tabEnter: state.tabEnter });
  return { layout, form, platform, geometry, model };
}

function fillLayoutSelect() {
  const sys = getLayout(detection.layoutId);
  layoutSel.replaceChildren();
  layoutSel.append(new Option(`System keyboard: ${sys?.name ?? 'US'}`, 'system'));
  if (state.custom) {
    const n = Object.keys(state.custom.overrides).length;
    layoutSel.append(new Option(`My keyboard (calibrated, ${n} keys)`, 'custom'));
  }
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const l of LAYOUTS) {
    let g = groups.get(l.group);
    if (!g) {
      g = document.createElement('optgroup');
      g.label = l.group;
      groups.set(l.group, g);
      layoutSel.append(g);
    }
    g.append(new Option(l.name, l.id));
  }
  if (state.layoutId === 'custom' && !state.custom) state.layoutId = 'system';
  layoutSel.value = state.layoutId;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function render() {
  const { layout, form, platform, geometry, model } = resolve();
  const lossy = state.policy === 'realistic';
  if (lossy) state.mode = 'encrypt';

  // Controls reflect state.
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => {
    const on = b.dataset.mode === state.mode;
    b.setAttribute('aria-checked', String(on));
    b.disabled = lossy && b.dataset.mode === 'decrypt';
  });
  document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((b) =>
    b.setAttribute('aria-checked', String(b.dataset.dir === state.direction)));
  document.querySelectorAll<HTMLInputElement>('input[name=policy]').forEach((r) => (r.checked = r.value === state.policy));
  keysInput.value = String(state.keys);
  $<HTMLSelectElement>('form').value = state.form;
  $<HTMLSelectElement>('platform').value = state.platform;
  $<HTMLInputElement>('tab-enter').checked = state.tabEnter;
  $<HTMLInputElement>('remember').checked = state.rememberText;
  $('lossy-badge').hidden = !lossy;
  $<HTMLButtonElement>('swap').disabled = lossy;
  $('input-label').textContent = state.mode === 'encrypt' ? 'Plaintext' : 'Ciphertext';
  $('output-label').textContent = state.mode === 'encrypt' ? 'Ciphertext' : 'Plaintext';

  const formName = { ansi: 'ANSI', iso: 'ISO', jis: 'JIS' }[form];
  const sysNote = state.layoutId === 'system' ? `${layout.name}, ${SOURCE_TEXT[detection.source]}. ` : '';
  $('layout-hint').textContent = `${sysNote}Using ${formName} keys with a ${platform === 'mac' ? 'Mac' : 'PC'} bottom row.`;

  // Cipher.
  const delta = deltaOf(state);
  const r = transform(
    state.mode === 'encrypt' ? input.value.normalize('NFC') : input.value,
    model,
    state.mode === 'encrypt' ? delta : -delta,
    state.policy,
  );
  output.value = r.text;

  const msgs: string[] = [];
  if (r.unknown) msgs.push(`${plural(r.unknown, 'character')} not on this keyboard, left unchanged.`);
  if (lossy && r.dropped) msgs.push(`${plural(r.dropped, 'keystroke')} typed nothing.`);
  if (state.policy === 'symbol' && state.mode === 'encrypt' && r.hadTokens) {
    msgs.push('The input contains ⟦…⟧ key tokens. They are treated as keystrokes, so decrypting will turn them into characters.');
  }
  notes.replaceChildren(...msgs.map((m) => Object.assign(document.createElement('p'), { textContent: m })));

  keyboard.render(model, geometry, delta, state.policy);
  renderAllShifts(model);
  $('calib-count').textContent = Object.keys(calib).length
    ? `${plural(Object.keys(calib).length, 'key')} learned`
    : 'Nothing learned yet.';

  state.text = input.value;
  saveSettings(state);
}

function renderAllShifts(model: ReturnType<typeof resolve>['model']) {
  const list = $('all-shifts');
  list.replaceChildren();
  if (!input.value) {
    list.append(Object.assign(document.createElement('li'), { textContent: 'Type something above first.', className: 'hint' }));
    return;
  }
  const sample = input.value.slice(0, 400);
  const sign = state.mode === 'encrypt' ? 1 : -1;
  for (const dir of ['left', 'right'] as Direction[]) {
    for (let n = 1; n <= 3; n++) {
      const d = sign * (dir === 'right' ? n : -n);
      const text = transform(sample, model, d, state.policy).text;
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn small';
      btn.textContent = 'Use';
      btn.title = `Set direction ${dir}, ${n} key(s)`;
      btn.addEventListener('click', () => {
        state.direction = dir;
        state.keys = n;
        render();
      });
      const tag = document.createElement('span');
      tag.className = 'shift-tag';
      tag.textContent = `${dir === 'left' ? '←' : '→'} ${n}`;
      const out = document.createElement('code');
      out.textContent = text.replace(/\n/g, '⏎').replace(/\t/g, '⇥');
      li.append(tag, out, btn);
      list.append(li);
    }
  }
}

// Wiring.
input.value = state.rememberText ? state.text : '';
input.addEventListener('input', render);

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) =>
  b.addEventListener('click', () => {
    state.mode = b.dataset.mode as Settings['mode'];
    render();
  }));
document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((b) =>
  b.addEventListener('click', () => {
    state.direction = b.dataset.dir as Direction;
    render();
  }));
document.querySelectorAll<HTMLInputElement>('input[name=policy]').forEach((r) =>
  r.addEventListener('change', () => {
    state.policy = r.value as Policy;
    render();
  }));

const setKeys = (n: number) => {
  state.keys = Math.min(12, Math.max(1, Math.round(n) || 1));
  render();
};
keysInput.addEventListener('change', () => setKeys(Number(keysInput.value)));
$('keys-dec').addEventListener('click', () => setKeys(state.keys - 1));
$('keys-inc').addEventListener('click', () => setKeys(state.keys + 1));

layoutSel.addEventListener('change', () => {
  state.layoutId = layoutSel.value;
  render();
});
$<HTMLSelectElement>('form').addEventListener('change', (e) => {
  state.form = (e.target as HTMLSelectElement).value as Settings['form'];
  render();
});
$<HTMLSelectElement>('platform').addEventListener('change', (e) => {
  state.platform = (e.target as HTMLSelectElement).value as Settings['platform'];
  render();
});
$<HTMLInputElement>('tab-enter').addEventListener('change', (e) => {
  state.tabEnter = (e.target as HTMLInputElement).checked;
  render();
});
$<HTMLInputElement>('remember').addEventListener('change', (e) => {
  state.rememberText = (e.target as HTMLInputElement).checked;
  render();
});

$('swap').addEventListener('click', () => {
  input.value = output.value;
  state.mode = state.mode === 'encrypt' ? 'decrypt' : 'encrypt';
  render();
  input.focus();
});

$('copy').addEventListener('click', async () => {
  const btn = $<HTMLButtonElement>('copy');
  try {
    await navigator.clipboard.writeText(output.value);
  } catch {
    output.select();
    document.execCommand('copy');
  }
  btn.textContent = 'Copied';
  setTimeout(() => (btn.textContent = 'Copy'), 1200);
});

// Calibration.
$('calib').addEventListener('keydown', (e) => {
  if (learnKey(e as KeyboardEvent, resolve().platform, calib)) render();
});
$('calib-use').addEventListener('click', () => {
  if (!Object.keys(calib).length) return;
  const baseId = state.layoutId === 'custom' && state.custom ? state.custom.baseId : resolveLayout().id;
  state.custom = { baseId, overrides: structuredClone(calib) };
  state.layoutId = 'custom';
  fillLayoutSelect();
  render();
});
$('calib-clear').addEventListener('click', () => {
  calib = {};
  state.custom = null;
  $<HTMLTextAreaElement>('calib').value = '';
  fillLayoutSelect();
  render();
});

fillLayoutSelect();
render();

// Upgrade the guess with the Keyboard API where available.
detectSystemLayout().then((d) => {
  if (d.layoutId === detection.layoutId && d.source === detection.source) return;
  detection = d;
  fillLayoutSelect();
  render();
});
