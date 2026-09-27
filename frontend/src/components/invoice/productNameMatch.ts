/**
 * Tovar nomini bazadagi nomlar bilan umumiy so'zlari bo'yicha solishtirish.
 *
 * Matndan import qilingan nom o'zgartirilmaydi ("Виноград Тайфи свежий"), lekin
 * Код ТН ВЭД shartnoma spetsifikatsiyasi / TNVED ro'yxatidagi nomga bog'langan
 * ("Виноград свежий столовых сортов"). Aynan moslik bo'lmasa kod shu funksiya
 * orqali umumiy so'z ("виноград") bo'yicha topiladi.
 */

/**
 * Tovar turini emas, holatini/sifatini bildiruvchi so'z o'zaklari. Ular deyarli
 * hamma nomda uchraydi ("свежий"), shuning uchun yolg'iz o'zi moslik bermaydi —
 * faqat bir xil turdagi bir nechta variant orasidan tanlashda yordam beradi.
 */
const DESCRIPTOR_STEMS = [
  'свеж',
  'сушен',
  'сух',
  'столов',
  'сорт',
  'урожа',
  'охлажд',
  'заморож',
  'прочи',
  'проч',
  'кроме',
  'друг',
  'вид',
];

/** Descriptor so'z mosligining og'irligi — tur so'zi mosligidan ancha kichik */
const DESCRIPTOR_WEIGHT = 0.1;

/** Qo'shimchalari kesilgandan keyin o'zakning eng qisqa uzunligi */
const MIN_STEM = 3;

/** Prefiks bo'yicha moslik uchun qisqa o'zakning eng kichik uzunligi ("перси" ~ "персик") */
const MIN_PREFIX_STEM = 4;

/** Rus tilidagi otlar/sifatlar qo'shimchalari — eng uzunidan boshlab */
const ENDINGS = [
  'ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
  'ый', 'ий', 'ой', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ых', 'их', 'ым', 'им', 'ую', 'юю',
  'ов', 'ев', 'ам', 'ям', 'ах', 'ях', 'ом', 'ем',
  'а', 'я', 'ы', 'и', 'о', 'е', 'у', 'ю', 'й', 'ь',
];

const stem = (word: string): string => {
  for (const ending of ENDINGS) {
    if (word.endsWith(ending) && word.length - ending.length >= MIN_STEM) {
      return word.slice(0, -ending.length);
    }
  }
  return word;
};

/** Nomni so'z o'zaklariga ajratadi (registr, ё, tinish belgilari, raqamlar hisobga olinmaydi) */
export const nameStems = (name: string): string[] =>
  name
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^a-zа-я]+/)
    .filter((word) => word.length >= MIN_STEM)
    .map(stem);

const isDescriptor = (s: string): boolean => DESCRIPTOR_STEMS.some((d) => s.startsWith(d));

const stemsMatch = (a: string, b: string): boolean => {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= MIN_PREFIX_STEM && long.startsWith(short);
};

interface MatchScore {
  /** Umumiy tur so'zlari soni (descriptor bo'lmaganlar) */
  core: number;
  /** Umumiy descriptor so'zlar hissasi */
  descriptor: number;
  /** Nomdagi birinchi tur so'zi (odatda asosiy ot: "Виноград") mos keldimi */
  head: boolean;
}

const scoreMatch = (sourceStems: string[], candidateStems: string[]): MatchScore => {
  const score: MatchScore = { core: 0, descriptor: 0, head: false };
  const firstCore = candidateStems.find((s) => !isDescriptor(s));
  sourceStems.forEach((s) => {
    const hit = candidateStems.find((c) => stemsMatch(s, c));
    if (!hit) return;
    if (isDescriptor(s) || isDescriptor(hit)) {
      score.descriptor += DESCRIPTOR_WEIGHT;
    } else {
      score.core += 1;
      if (hit === firstCore) score.head = true;
    }
  });
  return score;
};

/**
 * `name` ga eng mos nomni `candidates` dan qaytaradi (yoki null).
 *
 * Kamida bitta tur so'zi ("виноград") umumiy bo'lishi SHART — faqat "свежий"
 * mos kelishi yetarli emas. Teng holatlarda: asosiy ot mos kelgani, keyin
 * descriptorlar ko'p mos kelgani, keyin ro'yxatda oldinroq turgani (chaqiruvchi
 * ustuvor manbani — spetsifikatsiyani — boshiga qo'yadi) tanlanadi.
 */
export const findClosestProductName = (name: string, candidates: string[]): string | null => {
  const sourceStems = nameStems(name);
  if (sourceStems.length === 0) return null;

  let best: { name: string; score: MatchScore } | null = null;
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);

    const score = scoreMatch(sourceStems, nameStems(trimmed));
    if (score.core === 0) continue;
    if (
      !best ||
      score.core > best.score.core ||
      (score.core === best.score.core && Number(score.head) > Number(best.score.head)) ||
      (score.core === best.score.core &&
        score.head === best.score.head &&
        score.descriptor > best.score.descriptor)
    ) {
      best = { name: trimmed, score };
    }
  }
  return best?.name ?? null;
};

/** Ikki nomda kamida bitta umumiy tur so'zi bormi (AI tavsiyasini tekshirish uchun) */
export const sharesCoreWord = (a: string, b: string): boolean =>
  scoreMatch(nameStems(a), nameStems(b)).core > 0;
