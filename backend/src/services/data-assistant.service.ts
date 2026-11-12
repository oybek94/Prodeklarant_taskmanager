import OpenAI from 'openai';
import { Client } from 'pg';
import { z } from 'zod';
import { assistantModel, samplingParams } from '../ai/models';
import { redactSensitive } from '../middleware/audit';

/** Modelga qaytariladigan qatorlar chegarasi — katta natija xotira va OpenAI xarajatini oshiradi */
export const MAX_RESULT_ROWS = 200;
const STATEMENT_TIMEOUT_MS = 10_000;

/**
 * So'rov tanasi. `history` ga faqat user/assistant xabarlari kiradi: aks holda mijoz
 * `system` xabari yuborib, modelning qoidalarini almashtirib qo'yishi mumkin edi.
 */
export const dataAssistantRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }))
    .max(20)
    .optional(),
});

export type AssistantHistory = NonNullable<z.infer<typeof dataAssistantRequestSchema>['history']>;

/**
 * Model yozgan SQL bazaga yuborilishidan oldin tekshiriladi. Xato matni qaytsa — bajarilmaydi.
 *
 * Bitta buyruq sharti muhim: `SELECT 1; COMMIT; DELETE ...` ko'rinishidagi so'rov
 * `BEGIN READ ONLY` tranzaksiyasini COMMIT bilan yopib, qolganini yozish rejimida bajarardi.
 */
export function validateReadOnlySql(query: string): string | null {
  const sql = query.trim().replace(/;+\s*$/, '');
  if (!/^(select|with)\b/i.test(sql)) return "Faqat SELECT so'rovlariga ruxsat berilgan!";
  if (sql.includes(';')) return "Bir so'rovda faqat bitta SQL buyrug'i bo'lishi mumkin.";
  if (/password/i.test(sql)) return "Parol ustunlarini o'qish taqiqlangan.";
  return null;
}

type QueryResult = unknown[] | { rows: unknown[]; truncated: true; note: string } | { error: string };

/**
 * Model yozgan SELECT so'rovini FAQAT o'qish huquqli ulanish (READ_ONLY_DATABASE_URL) orqali,
 * vaqt chegarali READ ONLY tranzaksiyada bajaradi. Faqat-o'qish ulanishi sozlanmagan bo'lsa
 * asosiy (yozish huquqli) bazaga tushmaydi — rad etadi.
 */
export async function runReadOnlyQuery(query: string): Promise<QueryResult> {
  const validationError = validateReadOnlySql(query);
  if (validationError) return { error: validationError };

  const connectionString = process.env.READ_ONLY_DATABASE_URL;
  if (!connectionString) {
    console.error("[AI Data Assistant] READ_ONLY_DATABASE_URL sozlanmagan — so'rov bajarilmadi.");
    return { error: "Faqat-o'qish ulanishi sozlanmagan. Administratorga murojaat qiling." };
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    // Chegara bazaning o'zida qo'llanadi (bittasi ortiqcha — "kesildi"ni bilish uchun):
    // aks holda million qatorli natija avval to'liq xotiraga yuklanardi.
    const sql = query.trim().replace(/;+\s*$/, '');
    const res = await client.query(`SELECT * FROM (${sql}) AS assistant_query LIMIT ${MAX_RESULT_ROWS + 1}`);

    const truncated = res.rows.length > MAX_RESULT_ROWS;
    // SELECT * parol hashini ham olib keladi — modelga (va OpenAI'ga) ketmasin
    const rows = redactSensitive(res.rows.slice(0, MAX_RESULT_ROWS)) as unknown[];
    if (truncated) {
      return {
        rows,
        truncated: true,
        note: `Natija ${MAX_RESULT_ROWS} qatordan ko'p; faqat birinchi ${MAX_RESULT_ROWS} tasi ko'rsatildi. Yig'ma (COUNT/SUM/GROUP BY) so'rov yozing.`,
      };
    }
    return rows;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SQL XATOSI]:', message);
    return { error: message };
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// AI tushunishi uchun bazaning qisqartirilgan sxemasi (System Prompt uchun)
const DATABASE_SCHEMA = `
Siz Prodeklarant biznes tizimining ma'lumotlar tahlilchisisiz.
Quyida PostgreSQL bazasidagi asosiy jadvallar va ularning ustunlari keltirilgan.

MUHIM QOIDA (PostgreSQL va Prisma uchun):
Jadval va ustun nomlari case-sensitive (katta-kichik harfga sezgir) bo'lgani uchun, SQL yozayotganda barcha jadval va ustun nomlarini DOIM qo'shtirnoqqa (double quotes) oling!
Masalan: SELECT "id", "name" FROM "User" WHERE "role" = 'ADMIN'; (SELECT * FROM User deb yozish XATO!)

Jadvallar (Aynan shu nomlar bilan qo'shtirnoq ichida yozing):
1. "User" (xodimlar): "id", "name", "email", "role", "branchId", "xp", "active".
2. "Branch" (filiallar): "id", "name".
3. "Client" (mijozlar): "id", "name", "phone", "dealAmount".
4. "Task" (ishlar/topshiriqlar): "id", "clientId", "branchId", "status", "createdById", "createdAt", "snapshotDealAmount".
5. "TaskStage" (ish bosqichlari): "id", "taskId", "name", "status", "assignedToId", "price".
6. "Transaction" (moliya/to'lovlar): "id", "type", "amount", "currency", "paymentMethod", "date", "clientId", "workerId", "branchId".
7. "Invoice" (hisob-fakturalar): "id", "invoiceNumber", "taskId", "clientId", "branchId", "totalAmount", "currency", "date".
8. "KpiLog" (xodimlar bonusi): "id", "userId", "taskId", "stageName", "amount", "createdAt", "currency".

Qo'shimcha Qoidalar: 
- So'rovlar (query) xavfsiz va faqat o'qish (SELECT) uchun mo'ljallangan bo'lishi shart.
- Vaqtlar UTC da saqlanadi, sanalarni hisoblashda buni inobatga oling.
`;

export class DataAssistantService {
  /**
   * Foydalanuvchining savoliga javob berish uchun Agent mantig'i
   */
  public async askQuestion(question: string, conversationHistory: AssistantHistory = []): Promise<string> {
    const messages: any[] = [
      { role: 'system', content: DATABASE_SCHEMA },
      ...conversationHistory,
      { role: 'user', content: question },
    ];

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'run_sql_query',
          description: 'PostgreSQL bazasiga SQL SELECT so\'rovini yuboradi va natijani JSON shaklida qaytaradi.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Tugallangan va ishlashga tayyor PostgreSQL SELECT so\'rovi.',
              },
            },
            required: ['query'],
          },
        },
      },
    ];
    const MAX_ROUNDS = 5;

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const isLastRound = round === MAX_ROUNDS - 1;
        const response = await getOpenAI().chat.completions.create({
          model: assistantModel(),
          messages: messages,
          ...samplingParams(assistantModel(), round === 0 ? 0 : 0.2),
          // Oxirgi raundda tool berilmaydi — model yakuniy javob yozishga majbur
          ...(isLastRound ? {} : { tools, tool_choice: 'auto' as const }),
        });

        const responseMessage = response.choices[0].message;
        const toolCalls = responseMessage.tool_calls ?? [];

        // AI to'g'ridan-to'g'ri javob bergan bo'lsa
        if (toolCalls.length === 0) {
          return responseMessage.content || 'Kechirasiz, javob topa olmadim.';
        }

        // Model bir javobda bir nechta parallel tool_call qaytarishi mumkin —
        // OpenAI HAR BIRIGA alohida 'tool' javobini talab qiladi
        messages.push(responseMessage);
        for (const toolCall of toolCalls as any[]) {
          let result: unknown;
          if (toolCall.function?.name !== 'run_sql_query') {
            result = { error: `Noma'lum funksiya: ${toolCall.function?.name}` };
          } else {
            try {
              const sqlQuery = JSON.parse(toolCall.function.arguments).query;
              console.log('[AI Data Assistant] Executing SQL:', sqlQuery);
              result = await runReadOnlyQuery(sqlQuery);
            } catch (err: any) {
              result = { error: err.message };
            }
          }
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(result),
          });
        }
      }

      return 'Javob shakllantirishda xatolik.';

    } catch (error: any) {
      console.error('[DataAssistantService] Error:', error);
      throw new Error('Sun\'iy intellekt xizmatida xatolik yuz berdi: ' + error.message);
    }
  }
}
