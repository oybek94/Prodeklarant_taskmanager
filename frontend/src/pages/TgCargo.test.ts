// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TgCargo from './TgCargo';

const context = {
  launch: { draft: null },
  clientName: 'Namuna Mijoz',
  contracts: [
    { id: 1, contractNumber: '12/2026', buyerName: 'Buyer A', currency: 'USD', cities: [{ text: 'DAP Moskva', pairedCustoms: null }], customs: ['Post A'], destinations: [] },
    { id: 2, contractNumber: '7/2026', buyerName: 'Buyer B', currency: 'KZT', cities: [{ text: 'FCA Fergana', pairedCustoms: null }], customs: ['Post B'], destinations: [] },
  ],
  branches: [],
  products: ['Xurmo', 'Uzum'],
  packagingTypes: ['yashik'],
};

const savedDraft = {
  id: 5,
  status: 'OPEN',
  version: 1,
  data: { contractId: 1, branchId: null, header: { invoiceNumber: '77' }, items: [] },
  authors: {},
  missing: [],
  complete: false,
  messageId: null,
  completedByName: null,
};

const backHandlers = new Set<() => void>();
const webApp = {
  initData: 'test',
  ready: vi.fn(),
  expand: vi.fn(),
  close: vi.fn(),
  enableClosingConfirmation: vi.fn(),
  disableClosingConfirmation: vi.fn(),
  BackButton: {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: (handler: () => void) => void backHandlers.add(handler),
    offClick: (handler: () => void) => void backHandlers.delete(handler),
  },
};

let host: HTMLDivElement;
let root: Root;

const find = <T extends HTMLElement>(selector: string, text?: string): T | undefined =>
  Array.from(host.querySelectorAll<T>(selector)).find((el) => text === undefined || el.textContent?.includes(text));

const must = <T extends HTMLElement>(selector: string, text?: string): T => {
  const el = find<T>(selector, text);
  if (!el) throw new Error(`Topilmadi: ${selector} ${text ?? ''}`);
  return el;
};

const click = (selector: string, text?: string) => act(async () => must(selector, text).click());

const type = (input: HTMLInputElement, value: string) =>
  act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

const option = (text: string) => must<HTMLButtonElement>('.tgc-option', text);
const pickOption = (text: string) => click('.tgc-option', text);
const invoiceInput = () => must<HTMLInputElement>('#tgc-invoice');
/** n-tovar (0 dan) bo'limidagi Нетто katagi */
const nettoInput = (n: number) => host.querySelectorAll<HTMLInputElement>('input[id$="-netto"]')[n];
const undoButton = () => find<HTMLButtonElement>('.tgc-undo button', 'Qaytarish');

/** Oxirgi chaqiruv yoqish bo'lsa true */
const closingGuardOn = () => {
  const last = (fn: ReturnType<typeof vi.fn>) => Math.max(0, ...fn.mock.invocationCallOrder);
  return last(webApp.enableClosingConfirmation) > last(webApp.disableClosingConfirmation);
};

beforeEach(async () => {
  vi.clearAllMocks();
  backHandlers.clear();
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Element.prototype.scrollIntoView = () => {};
  window.Telegram = { WebApp: webApp };
  vi.stubGlobal('fetch', async (url: string) => ({ ok: true, status: 200, json: async () => (url.endsWith('/context') ? context : savedDraft) }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(TgCargo)));
  await act(async () => {
    await vi.waitFor(() => must('.tgc-bar'));
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('saqlanmagan ma\'lumot himoyasi', () => {
  it('hech narsa kiritilmaganda yopish tasdig\'i so\'ralmaydi', () => {
    expect(closingGuardOn()).toBe(false);
  });

  it('o\'zgarish paydo bo\'lsa yopish tasdig\'i yoqiladi, saqlangach o\'chadi', async () => {
    await pickOption('12/2026');
    expect(closingGuardOn()).toBe(true);
    await type(invoiceInput(), '77');
    await click('.tgc-send', 'Saqlash');
    expect(host.textContent).toContain('Saqlandi');
    expect(closingGuardOn()).toBe(false);
  });
});

describe('shartnoma tanlovi', () => {
  it('tanlangan shartnoma qayta bosilsa tanlov va to\'ldirilgan maydonlar saqlanadi', async () => {
    await pickOption('12/2026');
    await pickOption('DAP Moskva');
    await pickOption('12/2026');
    expect(option('12/2026').getAttribute('aria-pressed')).toBe('true');
    expect(option('DAP Moskva').getAttribute('aria-pressed')).toBe('true');
    expect(undoButton()).toBeUndefined();
  });

  it('boshqa shartnomaga o\'tib tozalangan maydonlarni qaytarish mumkin', async () => {
    await pickOption('12/2026');
    await pickOption('DAP Moskva');
    await pickOption('Post A');
    await pickOption('7/2026');
    expect(find('.tgc-option', 'DAP Moskva')).toBeUndefined();

    await act(async () => undoButton()!.click());

    expect(option('12/2026').getAttribute('aria-pressed')).toBe('true');
    expect(option('DAP Moskva').getAttribute('aria-pressed')).toBe('true');
    expect(option('Post A').getAttribute('aria-pressed')).toBe('true');
    expect(undoButton()).toBeUndefined();
  });

  it('tozalanadigan maydon bo\'lmasa qaytarish taklif qilinmaydi', async () => {
    await pickOption('12/2026');
    await pickOption('7/2026');
    expect(undoButton()).toBeUndefined();
  });
});

describe('tovarni o\'chirish', () => {
  it('o\'chirilgan tovar o\'z o\'rniga qiymatlari bilan qaytadi', async () => {
    await pickOption('12/2026');
    await type(nettoInput(0), '100');
    await click('.tgc-add');
    await type(nettoInput(1), '200');
    await click('.tgc-remove');
    expect(nettoInput(1)).toBeUndefined();
    expect(nettoInput(0).value).toBe('200');

    await act(async () => undoButton()!.click());

    expect(nettoInput(0).value).toBe('100');
    expect(nettoInput(1).value).toBe('200');
    expect(undoButton()).toBeUndefined();
  });

  it('ketma-ket o\'chirilganlar birin-ketin qaytadi', async () => {
    await pickOption('12/2026');
    await type(nettoInput(0), '1');
    await click('.tgc-add');
    await type(nettoInput(1), '2');
    await click('.tgc-add');
    await type(nettoInput(2), '3');
    await click('.tgc-remove');
    await click('.tgc-remove');

    await act(async () => undoButton()!.click());
    await act(async () => undoButton()!.click());

    expect([0, 1, 2].map((n) => nettoInput(n).value)).toEqual(['1', '2', '3']);
  });

  it('bo\'sh tovar o\'chirilsa qaytarish taklif qilinmaydi', async () => {
    await pickOption('12/2026');
    await click('.tgc-add');
    await click('.tgc-remove');
    expect(undoButton()).toBeUndefined();
  });

  it('saqlangandan keyin qaytarish taklifi qolmaydi', async () => {
    await pickOption('12/2026');
    await type(nettoInput(0), '100');
    await click('.tgc-add');
    await click('.tgc-remove');
    await click('.tgc-send', 'Saqlash');
    await click('.tgc-ghost', 'Formaga qaytish');
    expect(undoButton()).toBeUndefined();
  });
});

describe('pastdan ochiladigan ro\'yxat', () => {
  const openSheet = async () => {
    await pickOption('12/2026');
    const trigger = must<HTMLButtonElement>('.tgc-picker');
    trigger.focus();
    await act(async () => trigger.click());
    return trigger;
  };

  it('ochilganda fokus ro\'yxat ichiga o\'tadi, yopilganda tugmaga qaytadi', async () => {
    const trigger = await openSheet();
    expect(must('.tgc-sheet').contains(document.activeElement)).toBe(true);
    await click('.tgc-close');
    expect(find('.tgc-sheet')).toBeUndefined();
    expect(document.activeElement).toBe(trigger);
  });

  it('modal dialog sifatida ochiladi va Escape (cancel) bilan yopiladi', async () => {
    await openSheet();
    const dialog = must('dialog');
    await act(async () => void dialog.dispatchEvent(new Event('cancel', { cancelable: true })));
    expect(find('.tgc-sheet')).toBeUndefined();
  });

  it('Telegram "orqaga" tugmasi ro\'yxatni yopadi va yashirinadi', async () => {
    await openSheet();
    expect(webApp.BackButton.show).toHaveBeenCalled();
    await act(async () => backHandlers.forEach((handler) => handler()));
    expect(find('.tgc-sheet')).toBeUndefined();
    expect(webApp.BackButton.hide).toHaveBeenCalled();
    expect(backHandlers.size).toBe(0);
  });
});
