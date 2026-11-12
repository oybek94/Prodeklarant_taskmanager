import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * /api/tasks ostiga bir nechta router ulangan (server.ts) va har birining o'z `:id`/`:taskId`
 * parametri bor. Filial tekshiruvi `router.param` orqali har router'ga ALOHIDA ulanadi —
 * yangi router qo'shilib, tekshiruv unutilsa (yoki parametr nomi boshqacha bo'lsa) boshqa
 * filial vazifasi ID almashtirib ochiladi. Bu test shuni oldindan ushlaydi.
 */
const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

const mountedUnderTasks = (): string[] => {
  const server = read('server.ts');
  const importNames = [...server.matchAll(/app\.use\('\/api\/tasks',[^;]*?,\s*(\w+)\);/g)].map((m) => m[1]);
  return importNames.map((name) => {
    const imp = server.match(new RegExp(String.raw`import\s+${name}\s+from\s+'\./routes/([\w-]+)'`));
    if (!imp) throw new Error(`${name} import topilmadi`);
    return `routes/${imp[1]}.ts`;
  });
};

describe('/api/tasks ostidagi router\'lar — filial tekshiruvi', () => {
  const files = mountedUnderTasks();

  it('ulangan router\'lar topildi (tasks, status, documents, driver-code, ai-checks)', () => {
    expect(files.sort()).toEqual([
      'routes/driver-code.ts',
      'routes/task-ai-checks.ts',
      'routes/task-documents.ts',
      'routes/task-status.ts',
      'routes/tasks.ts',
    ]);
  });

  it.each(files)('%s: ishlatilgan har bir ID parametriga taskBranchParam ulangan', (file) => {
    const src = read(file);
    const withoutParamCalls = src.replace(/router\.param\([^)]*\)/g, '');
    const usedParams = ['id', 'taskId'].filter((p) => new RegExp(String.raw`['"\x60][^'"\x60]*:${p}\b`).test(withoutParamCalls));
    expect(usedParams.length).toBeGreaterThan(0);
    for (const param of usedParams) {
      expect(src, `${file}: :${param} uchun router.param yo'q`).toMatch(new RegExp(String.raw`router\.param\(\s*'${param}'\s*,\s*taskBranchParam\s*\)`));
    }
  });
});
