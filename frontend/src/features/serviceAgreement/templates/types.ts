import type { AgreementTokens } from '../tokens';

type Predicate = (t: AgreementTokens) => boolean;

export type Block =
  | { kind: 'heading'; level: 1 | 2; text: string; when?: Predicate }
  | { kind: 'paragraph'; text: string; when?: Predicate }
  | { kind: 'table'; header: string[]; widths: number[]; rows: (t: AgreementTokens) => string[][]; when?: Predicate }
  | { kind: 'signature'; when?: Predicate }
  | { kind: 'pageBreak'; when?: Predicate };

export interface AgreementTemplate {
  version: string;
  blocks: Block[];
}

/** Shablonda ishlatib bo'ladigan matn tokenlari (jadval/enum maydonlari bundan mustasno) */
type TextTokenKey = {
  [K in keyof AgreementTokens]: AgreementTokens[K] extends string ? K : never;
}[keyof AgreementTokens];

/**
 * `{{token}}` larni qiymatga almashtiradi.
 * Yechilmagan token qolsa — xato: bunday matn qog'ozga chiqmasligi kerak.
 */
export function resolveText(text: string, tokens: AgreementTokens): string {
  const out = text.replace(/\{\{(\w+)\}\}/g, (_full, key: string) => {
    const value = (tokens as unknown as Record<string, unknown>)[key];
    if (typeof value !== 'string') {
      throw new Error(`Shablonda noma'lum yoki matn bo'lmagan token: {{${key}}}`);
    }
    return value;
  });
  if (out.includes('{{')) {
    throw new Error(`Yechilmagan token qoldi: ${out.slice(out.indexOf('{{'), out.indexOf('{{') + 40)}`);
  }
  return out;
}

/** `when` shartidan o'tgan bloklar */
export function visibleBlocks(template: AgreementTemplate, tokens: AgreementTokens): Block[] {
  return template.blocks.filter((b) => (b.when ? b.when(tokens) : true));
}

export type { TextTokenKey };
