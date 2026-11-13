// Visual keyboard: shows the current layout on the current geometry and,
// on hover/tap, where a finger on that key lands.
import { land, type Model, type Policy } from '../engine';
import type { Geometry } from '../geometry';

const NAMES: Record<string, string> = {
  CapsLock: 'Caps Lock', ShiftLeft: 'left Shift', ShiftRight: 'right Shift', ControlLeft: 'left Control',
  ControlRight: 'right Control', AltLeft: 'left Option/Alt', AltRight: 'right Option/AltGr', MetaLeft: 'left Command/Win',
  MetaRight: 'right Command/Win', Fn: 'fn', Backspace: 'Backspace', Tab: 'Tab', Enter: 'Enter',
  ArrowLeft: 'left arrow', ArrowDown: 'up/down arrows', ArrowRight: 'right arrow', ContextMenu: 'Menu', Space: 'Space',
};

export function displayChar(ch: string): string {
  if (ch === ' ') return '␣';
  if (ch === '\t') return '⇥';
  if (ch === '\n') return '⏎';
  if (/\p{M}/u.test(ch)) return '◌' + ch;
  return ch;
}

function quote(ch: string): string {
  if (ch === ' ') return 'space';
  if (ch === '\t') return 'Tab (\\t)';
  if (ch === '\n') return 'Enter (\\n)';
  return `“${displayChar(ch)}”`;
}

export interface KeyboardView {
  render(model: Model, geometry: Geometry, delta: number, policy: Policy): void;
}

export function createKeyboard(root: HTMLElement, caption: HTMLElement): KeyboardView {
  let current: { model: Model; delta: number; policy: Policy } | null = null;
  const els = new Map<string, HTMLElement>();
  const defaultCaption = caption.textContent ?? '';

  function clearMarks() {
    root.querySelectorAll('.src, .dst').forEach((el) => el.classList.remove('src', 'dst'));
  }

  function show(code: string) {
    if (!current) return;
    const { model, delta, policy } = current;
    clearMarks();
    els.get(code)?.classList.add('src');
    const ch = model.chars.get(code)?.[0] ?? null;
    if (ch === null) {
      caption.textContent = `${NAMES[code] ?? code} doesn't type a character, so nothing is ever shifted from it.`;
      return;
    }
    const l = land(model, { code, level: 0 }, delta, policy);
    if (l.kind === 'edge') {
      caption.textContent = `${quote(ch)} → off the edge of the keyboard: nothing is typed.`;
      return;
    }
    els.get(l.code)?.classList.add('dst');
    if (l.kind === 'char') {
      caption.textContent = `${quote(ch)} → ${quote(l.text)}`;
    } else if (policy === 'symbol') {
      caption.textContent = `${quote(ch)} → ${NAMES[l.code] ?? l.code}, written as ⟦${model.labels.get(l.code)}⟧`;
    } else {
      const effect: Record<string, string> = {
        CapsLock: 'toggles Caps Lock', Backspace: 'deletes the previous character',
        Tab: 'types a tab', Enter: 'types a new line',
      };
      caption.textContent = `${quote(ch)} → ${NAMES[l.code] ?? l.code}: ${effect[l.code] ?? 'types nothing'}.`;
    }
  }

  root.addEventListener('mouseleave', () => {
    clearMarks();
    caption.textContent = defaultCaption;
  });

  return {
    render(model, geometry, delta, policy) {
      current = { model, delta, policy };
      root.replaceChildren();
      els.clear();
      root.setAttribute('aria-label', `Keyboard diagram, ${geometry.form.toUpperCase()} ${geometry.platform === 'mac' ? 'Mac' : 'PC'}`);
      for (const row of geometry.rows) {
        const rowEl = document.createElement('div');
        rowEl.className = 'kbd-row';
        for (const key of row) {
          const el = document.createElement(key.code ? 'button' : 'div');
          el.style.gridColumn = `span ${Math.round(key.w * 4)}`;
          if (!key.code) {
            el.className = 'key spacer';
            rowEl.append(el);
            continue;
          }
          const code = key.code;
          const [base, shift] = model.chars.get(code) ?? [null, null];
          el.className = 'key' + (base === null ? ' inert' : '');
          (el as HTMLButtonElement).type = 'button';
          el.dataset.code = code;
          if (base !== null) {
            const showShift = shift !== null && shift !== base.toUpperCase();
            el.innerHTML = '';
            if (showShift) {
              const s = document.createElement('span');
              s.className = 'shift';
              s.textContent = displayChar(shift);
              el.append(s);
            }
            const b = document.createElement('span');
            b.className = 'base';
            b.textContent = displayChar(base);
            el.append(b);
            el.title = `${code}: ${quote(base)}`;
          } else {
            const b = document.createElement('span');
            b.className = 'label';
            b.textContent = model.labels.get(code) ?? code;
            el.append(b);
            el.title = `${NAMES[code] ?? code} (types nothing)`;
          }
          el.addEventListener('mouseenter', () => show(code));
          el.addEventListener('focus', () => show(code));
          el.addEventListener('click', () => show(code));
          els.set(code, el);
          rowEl.append(el);
        }
        root.append(rowEl);
      }
    },
  };
}
