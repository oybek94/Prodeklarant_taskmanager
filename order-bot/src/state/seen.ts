import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from '../logger.js';

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../seen.json');
/** Faqat oxirgi N ta ID saqlanadi — fayl cheksiz o'smasligi uchun. */
const LIMIT = 500;

/**
 * Qayta ishlangan xatlarning Message-ID lari.
 * Qayta ulanish yoki qayta ishga tushishda bir xat ikki marta yuborilmaydi.
 */
export class SeenStore {
  private ids: string[] = [];
  private set = new Set<string>();

  load(): void {
    if (!existsSync(FILE)) return;
    try {
      const parsed: unknown = JSON.parse(readFileSync(FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        this.ids = parsed.filter((id): id is string => typeof id === 'string');
        this.set = new Set(this.ids);
        log.info(`seen.json yuklandi (${this.ids.length} ta yozuv)`);
      }
    } catch (error) {
      log.warn('seen.json o\'qilmadi, bo\'sh holatdan boshlanadi:', error);
    }
  }

  has(messageId: string): boolean {
    return this.set.has(messageId);
  }

  add(messageId: string): void {
    if (this.set.has(messageId)) return;
    this.ids.push(messageId);
    this.set.add(messageId);

    if (this.ids.length > LIMIT) {
      const dropped = this.ids.splice(0, this.ids.length - LIMIT);
      for (const id of dropped) this.set.delete(id);
    }

    this.persist();
  }

  private persist(): void {
    try {
      // Atomik yozuv: yozish paytida jarayon uzilsa fayl buzilmaydi.
      const temp = `${FILE}.tmp`;
      writeFileSync(temp, JSON.stringify(this.ids), 'utf8');
      renameSync(temp, FILE);
    } catch (error) {
      log.warn('seen.json saqlanmadi:', error);
    }
  }
}
