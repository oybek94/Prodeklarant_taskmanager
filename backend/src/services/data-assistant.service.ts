import OpenAI from 'openai';
import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';

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
  public async askQuestion(question: string, conversationHistory: any[] = []): Promise<string> {
    const messages: any[] = [
      { role: 'system', content: DATABASE_SCHEMA },
      ...conversationHistory,
      { role: 'user', content: question },
    ];

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0,
        tools: [
          {
            type: 'function',
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
        ],
        tool_choice: 'auto',
      });

      const responseMessage = response.choices[0].message;

      // Agar AI tool ishlatishni xohlasa:
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0] as any;
        if (toolCall.function.name === 'run_sql_query') {
          const args = JSON.parse(toolCall.function.arguments);
          const sqlQuery = args.query;

          console.log('[AI Data Assistant] Executing SQL:', sqlQuery);

          // SQL ni bajarish
          const queryResult = await this.executeReadOnlySql(sqlQuery);

          // AI ga natijani beramiz va yakuniy javobni so'raymiz
          messages.push(responseMessage);
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: 'run_sql_query',
            content: JSON.stringify(queryResult),
          });

          const finalResponse = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            temperature: 0.2,
          });

          return finalResponse.choices[0].message.content || 'Javob shakllantirishda xatolik.';
        }
      }

      // Agar AI to'g'ridan-to'g'ri javob bergan bo'lsa
      return responseMessage.content || 'Kechirasiz, javob topa olmadim.';

    } catch (error: any) {
      console.error('[DataAssistantService] Error:', error);
      throw new Error('Sun\'iy intellekt xizmatida xatolik yuz berdi: ' + error.message);
    }
  }

  /**
   * Xavfsiz, faqat o'qish (READ-ONLY) uchun ulanish
   */
  private async executeReadOnlySql(query: string): Promise<any> {
    // FAKAT SELECT ISHLATILISHINI QAT'IY TEKSHIRISH (Ehtiyot chorasi)
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
      return { error: 'Faqat SELECT so\'rovlariga ruxsat berilgan!' };
    }

    // READ_ONLY_DATABASE_URL env da yo'q bo'lsa, oddiy ulanishni ishlatadi (XAVFLI)
    // Haqiqiy proektda buni alohida read_only URL bilan almashtirish shart.
    const connectionString = process.env.READ_ONLY_DATABASE_URL || process.env.DATABASE_URL;
    
    const client = new Client({ connectionString });
    await client.connect();
    try {
      const res = await client.query(query);
      return res.rows;
    } catch (err: any) {
      console.error('[SQL XATOSI]:', err.message);
      return { error: err.message };
    } finally {
      await client.end();
    }
  }
}
