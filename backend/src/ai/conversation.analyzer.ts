import OpenAIClient from './openai.client';
import fs from 'fs';
import path from 'path';

export interface ConversationAnalysisResult {
  sentiment: {
    overall: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';
    score: number; // 1-10
    details: string;
    moments: { timestamp?: string; emotion: string; text: string }[];
  };
  keyInsights: {
    interests: string[];
    objections: string[];
    mainTopic: string;
    priceDiscussed: boolean;
    qualityDiscussed: boolean;
    deliveryDiscussed: boolean;
    details: string;
  };
  compliance: {
    greeting: boolean;
    greetingDetails: string;
    followedScript: boolean;
    scriptDetails: string;
    prohibitedWords: boolean;
    prohibitedWordsDetails: string;
    overallScore: number; // 1-100
    recommendations: string[];
  };
  summary: string;
}

export class ConversationAnalyzerService {
  private static get openai() {
    return OpenAIClient.getClient();
  }

  /**
   * OpenAI Whisper API orqali audio faylni matnga o'girish
   */
  static async transcribeAudio(filePath: string): Promise<string> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Audio fayl topilmadi: ${absolutePath}`);
    }

    const fileStream = fs.createReadStream(absolutePath);

    const transcription = await this.openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'uz', // O'zbek tili, Whisper avtomatik aniqlaydi ham
      response_format: 'text',
      prompt: 'Bu eksport deklaratsiya va bojxona xizmatlari bo\'yicha mijoz bilan sotuvchi o\'rtasidagi telefon suhbati. O\'zbek va Rus tillarida bo\'lishi mumkin.',
    });

    return transcription as unknown as string;
  }

  /**
   * GPT-4o orqali suhbat transkripsiyasini to'liq tahlil qilish
   */
  static async analyzeConversation(
    transcript: string,
    leadData: { companyName: string; productType?: string | null; region?: string | null }
  ): Promise<ConversationAnalysisResult> {
    const prompt = `Siz professional savdo suhbatlari tahlilchisisiz. Quyidagi mijoz bilan sotuvchi o'rtasidagi telefon suhbati transkripsiyasini to'liq tahlil qiling.

Mijoz ma'lumotlari:
- Kompaniya: ${leadData.companyName}
- Mahsulot: ${leadData.productType || 'Noma\'lum'}
- Hudud: ${leadData.region || 'Noma\'lum'}

SUHBAT TRANSKRIPSIYASI:
"""
${transcript}
"""

Quyidagi 4 ta yo'nalish bo'yicha chuqur tahlil qiling:

1. **SENTIMENT ANALYSIS (Kayfiyat tahlili)**:
   - Mijoz suhbat davomida qanday kayfiyatda edi?
   - overall: "POSITIVE" (xursand, qiziqgan), "NEGATIVE" (jahli chiqqan, norozi), "NEUTRAL" (befarq), yoki "MIXED" (aralash)
   - score: 1 dan 10 gacha (1 = juda salbiy, 10 = juda ijobiy)
   - Kayfiyat o'zgargan muhim lahzalarni ko'rsating

2. **KEY INSIGHTS (Muhim nuqtalar)**:
   - Mijozni aynan nima qiziqtirdi?
   - Narx muhokama qilindimi? Sifat? Yetkazib berish muddati?
   - Qanday e'tirozlar bildirildi?
   - Asosiy mavzu nima edi?

3. **COMPLIANCE (Qoidalarga rioya)**:
   - Sotuvchi salomlashdimi? O'zini tanishtirishdimi?
   - "Skript" bo'yicha gapirdimi? (professional, aniq, maqsadli suhbat yuritdimi?)
   - Taqiqlangan so'zlar yoki noto'g'ri munosabat bo'ldimi?
   - Umuman 1-100 gacha ball qo'ying
   - Tavsiyalar

4. **SUMMARY (Xulosa)**:
   - Butun suhbatni 2-3 ta gapda ixcham, aniq xulosa qiling. Bu xulosa CRM tizimiga avtomatik yoziladi.

Natijani FAQAT quyidagi JSON formatida qaytaring:
{
  "sentiment": {
    "overall": "POSITIVE|NEGATIVE|NEUTRAL|MIXED",
    "score": 7,
    "details": "Mijoz dastlab xotirjam edi, lekin narx muhokamasi vaqtida qiziqish ortdi",
    "moments": [
      {"emotion": "Qiziquvchanlik", "text": "Bu xizmat narxi qancha?"}
    ]
  },
  "keyInsights": {
    "interests": ["Eksport qilish imkoniyati", "Sertifikat olish muddati"],
    "objections": ["Narx yuqori", "Muddati uzoq"],
    "mainTopic": "Eksport sertifikati olish jarayoni",
    "priceDiscussed": true,
    "qualityDiscussed": false,
    "deliveryDiscussed": true,
    "details": "Mijoz asosan narx va muddat haqida so'radi"
  },
  "compliance": {
    "greeting": true,
    "greetingDetails": "Sotuvchi 'Assalomu alaykum, Prodeklarant kompaniyasidan...' deb boshladi",
    "followedScript": true,
    "scriptDetails": "Suhbat professional va maqsadli yuritildi",
    "prohibitedWords": false,
    "prohibitedWordsDetails": "Taqiqlangan so'zlar ishlatilmadi",
    "overallScore": 85,
    "recommendations": ["Yakunida keyingi qadamni aniqroq belgilash kerak edi"]
  },
  "summary": "Mijoz eksport sertifikati olish jarayoni va narxlari bilan qiziqdi. Sotuvchi xizmatlar haqida to'liq ma'lumot berdi. Mijoz narxni o'ylab ko'rmoqchi va ertaga qayta qo'ng'iroq qilishni so'radi."
}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Siz savdo suhbatlarini tahlil qilish bo\'yicha tajribali mutaxassiz. Har doim to\'g\'ri, batafsil va foydali tahlil berasiz. Javobni faqat JSON formatida qaytaring.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('AI javob qaytarmadi');

    return JSON.parse(content) as ConversationAnalysisResult;
  }
}
