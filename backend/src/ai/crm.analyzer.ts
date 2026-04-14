import OpenAIClient from './openai.client';

export interface LeadData {
  companyName: string;
  productType?: string | null;
  region?: string | null;
  estimatedExportVolume?: string | null;
  stage: string;
  activities?: any[];
}

export interface LeadScoreResult {
  score: number;
  explanation: string;
  temperature: 'HOT' | 'WARM' | 'COLD';
}

export interface LeadSummaryResult {
  summary: string;
  nextBestAction: string;
}

export interface DashboardInsightsResult {
  trend: string;
  forecast: string;
  anomaly: string;
}

export class CrmAnalyzerService {
  private static get openai() {
    return OpenAIClient.getClient();
  }

  static async analyzeLeadScore(lead: LeadData): Promise<LeadScoreResult> {
    const prompt = `Yangi lid tushdi. Quyidagi STRIKT mezonlar (rubric) asosida uni 1-100 gacha bo\'lgan 'Lead Score' bilan baholang:

1. Eksport yo\'nalishi (DAVLAT):
Agar quyidagi davlatlardan biri bo\'lsa:
Российская Федерация, Республика Казахстан, Республика Беларуссия, Кыргызстан, Таджикистан, Армения, Азербайджан, Молдова
-> +25 ball
Boshqa davlatlar -> +10 ball
Noma\'lum -> 0 ball

2. Eksport hajmi:
- 30 tadan yuqori -> +25 ball
- 10-30 ta -> +15 ball
- 10 tadan past -> +5 ball
- Noma\'lum -> 0 ball

3. Mahsulot turi:
- Мева yoki Сабзавот -> +20 ball
- Boshqa aniq mahsulot -> +10 ball
- Noma\'lum -> 0 ball

4. Hamkorlar:
Agar quyidagilardan kamida bittasi Kompaniya nomi ichida mavjud bo\'lsa:
АО ГРАНД - ТРЕЙД, АРВИАЙ (РАШЕН ВЕНЧУР ИНВЕСТМЕНТС), ТК Лето, РУСКИТ, ТС КОМАНДОР, Камелот-А, Розница К-1
-> +20 ball
Aks holda -> 0 ball

5. STIR (tashkil topgan yilni aniqlash):
Agar kompaniya nomida qo\'shilgan STIR (INN) (9 xonali son) bo\'lsa, boshidagi 3 ta raqamdan foydalaning:
- 302 -> 2012
- 303 -> 2013
- 304 -> 2014
- 305 -> 2015
- 306 -> 2016
- 307 -> 2017
- 308 -> 2018
- 309 -> 2019
- 310 -> 2020
- 311 -> 2021
- 312 bilan boshlansa -> 2022-2025 oralig\'i

Baholash:
- 2012-2016 -> +10 ball (tajribali)
- 2017-2020 -> +7 ball
- 2021 -> +5 ball
- 2022-2025 (312) -> +2 ball
- Noma\'lum -> 0 ball

Qoidalarga ko\'ra:
- Maksimal ball: 100
- Kuchli kombinatsiya (SNG + katta hajm + meva/sabzavot + kuchli hamkorlar + eski STIR) -> 80-100
- Ma\'lumotlar kam bo\'lsa -> 50 dan past

Lid ma\'lumotlari: 
Kompaniya: ${lead.companyName}
Mahsulot: ${lead.productType || 'Noma\'lum'}
Hudud (Davlat): ${lead.region || 'Noma\'lum'}
Hajmi: ${lead.estimatedExportVolume || 'Noma\'lum'}

Natijani faqatgina quyidagi JSON formatida qaytaring: {"score": ball_natijasi, "explanation": "1-2 gap bilan ballning asosiy sabablari", "temperature": "HOT yoku WARM yoku COLD"}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Siz CRM analizatorisiz. Har doim to\'g\'ri, qisqa va aniq javob berasiz.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('AI qaytargan ma\'lumot bo\'sh');

    return JSON.parse(content) as LeadScoreResult;
  }

  static async summarizeLeadHistory(lead: LeadData): Promise<LeadSummaryResult> {
    const logsText = lead.activities?.map(a => `[${new Date(a.createdAt).toLocaleDateString()}] ${a.user?.name || 'Kadr'}: ${a.note || a.type}`).join('\n') || 'Faoliyat yo\'q';

    const prompt = `Quyidagi lid va uning aloqa qilingan tarixiga asoslanib:
1. Holat bo'yicha maksimum 2 gap bilan aniq xulosa yozing.
2. Keyingi qadam (Next Best Action) sifatida menejer nima qilishi kerakligini maslahat bering (1 gap).

Lid ma'lumotlari:
Kompaniya: ${lead.companyName}
Mahsulot: ${lead.productType}
Hudud: ${lead.region}
Bosqich: ${lead.stage}

Faoliyat va izohlar tarixi:
${logsText}

Natijani faqat JSON formatida qaytaring: {"summary": "...", "nextBestAction": "..."}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Siz savdo bo\'limi boshqaruvchisi va maslahatchisisiz.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('AI qaytargan ma\'lumot bo\'sh');

    return JSON.parse(content) as LeadSummaryResult;
  }

  static async generateDashboardInsights(statsObject: any): Promise<DashboardInsightsResult> {
    const prompt = `CRM ning joriy oylik tahlil ma'lumotlari:
Jami lidlar: ${statsObject.totalLeads}
Uchrashuvlar: ${statsObject.todayMeetings}
Qo'ng'iroqlar: ${statsObject.todayActivities}
Bosqichlar (Voronka): ${JSON.stringify(statsObject.byStage)}
Lidlar ro'yxati: ${JSON.stringify(statsObject.todayMeetingsList)}
Sotuvchi reytingi: ${JSON.stringify(statsObject.sellerPerformance)}

Shu ma'lumotlarga asoslanib 3 ta ajoyib xulosa bering:
1. 'trend' - qaysi hudud yoki qaysi jarayonda yuksalish borligi haqida fakt.
2. 'forecast' - yaqin kelajakda (masalan bu oy) kutilayotgan potensial muvaffaqiyat.
3. 'anomaly' - nani yaxshilash kerakligi yoki nima g'alati ekanligi haqida.

Faqat JSON qaytaring: {"trend": "...", "forecast": "...", "anomaly": "..."}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Siz kompaniyaning ma\'lumotlar tahlilchisi va strategisiz. Tahlillarni aniq va tushunarli tilda bildirasiz.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('AI qaytargan ma\'lumot bo\'sh');

    return JSON.parse(content) as DashboardInsightsResult;
  }

  static async generateLeadMessage(lead: LeadData, context: string): Promise<{ message: string }> {
    const prompt = `Quyidagi mijoz uchun Telegram yoki Elektron pochta xabari matnini (commercial offer yoki follow-up) tayyorlab bering. Xabar jozibali, professional va o'zbek tilida, do'stona bo'lsin.

Mijoz ma'lumotlari:
Kompaniya: ${lead.companyName}
Mahsulot: ${lead.productType || 'Eksport mahsuloti'}
Hudud: ${lead.region || ''}

Xabar maqsadi yoki foydalanuvchi ko'rsatmasi: ${context}

Natijani faqat JSON formatida qaytaring: {"message": "..."}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Siz mohir kopirayter va savdo menejerisiz. Siz yozgan matnlar konversiyasi juda yuqori.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('AI qaytargan ma\'lumot bo\'sh');

    return JSON.parse(content) as { message: string };
  }
}
