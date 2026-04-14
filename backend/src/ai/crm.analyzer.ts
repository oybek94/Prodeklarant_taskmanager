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
    const prompt = `Yangi lid tushdi. Ushbu lidni ma'lumotlari asosida 1-100 gacha bo'lgan 'Lead Score' bilan baholang. Katta hajm (masalan, 30 tonnadan yuqori) yoki aniq hudud va mahsulot turi (qishloq xo'jaligi, to'qimachilik) sifatni oshiradi. 
Lid ma'lumotlari: 
Kompaniya: ${lead.companyName}
Mahsulot: ${lead.productType || 'Noma\'lum'}
Hudud: ${lead.region || 'Noma\'lum'}
Hajmi: ${lead.estimatedExportVolume || 'Noma\'lum'}

Natijani faqatgina quyidagi JSON formatida qaytaring: {"score": raqam_1_dan_100_gacha, "explanation": "qisqacha_izoh_uzbek_tilida", "temperature": "HOT" | "WARM" | "COLD"}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      model: 'gpt-4o-mini',
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
      model: 'gpt-4o-mini',
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
      model: 'gpt-4o-mini',
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
