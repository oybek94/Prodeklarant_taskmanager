# AI Asosidagi Hujjatlar Tekshirish Tizimi

## Umumiy ko'rinish

Bojxonaga topshirishdan oldin jarayon intizomini ta'minlaydigan va xatolarni aniqlaydigan ishlab chiqarishga tayyor AI sifat nazorati tizimi.

## Arxitektura

### Servislar

1. **ValidationService** (`services/validation.service.ts`)
   - Status asosida hujjatlar majburiyatini ta'minlash
   - Foydalanuvchi kirish nazorati
   - Status o'zgarishidan oldin kerakli hujjatlarni tekshirish

2. **DocumentService** (`services/document.service.ts`)
   - `pdf-parse` yordamida PDF matnini ajratish
   - Hujjat metadata'larini saqlash
   - Tur bo'yicha hujjatlarni olish

3. **AiService** (`services/ai.service.ts`)
   - OpenAI yordamida hujjatlarni strukturizatsiya qilish
   - Invoice-ST taqqoslash
   - AI prompt'larini boshqarish

### Ma'lumotlar bazasi modellari

- **DocumentMetadata**: Ajratilgan PDF matnini saqlaydi
- **StructuredDocument**: AI tomonidan strukturizatsiya qilingan JSON ma'lumotlarni saqlaydi
- **AiCheck**: AI tekshiruv natijalarini saqlaydi

### Yangi Task statuslari

- `INVOICE_READY`: Invoice PDF talab qilinadi
- `ST_READY`: Invoice + ST PDF talab qilinadi
- `FITO_READY`: Invoice + ST + FITO PDF talab qilinadi
- `PASSED_AI_CHECK`: AI tekshiruvi o'tdi
- `RETURNED`: AI tekshiruvi muvaffaqiyatsiz (kritik xatolar)

## API Endpoint'lar

### POST `/api/tasks/:id/status`
Task statusini hujjatlar tekshiruvi bilan yangilash.

**So'rov:**
```json
{
  "status": "ST_READY"
}
```

**Javob:**
```json
{
  "success": true,
  "task": {
    "id": 1,
    "status": "PASSED_AI_CHECK",
    "title": "Task nomi"
  }
}
```

**Tekshiruv qoidalari:**
- `INVOICE_READY`: Invoice PDF talab qilinadi
- `ST_READY`: Invoice + ST PDF talab qilinadi
- `FITO_READY`: Invoice + ST + FITO PDF talab qilinadi

**Avtomatik ishga tushirish:**
Status `ST_READY` ga o'rnatilganda, AI taqqoslash avtomatik ishga tushadi:
- Agar kritik xatolar topilsa → status = `RETURNED`
- Agar faqat ogohlantirishlar yoki xatolar bo'lmasa → status = `PASSED_AI_CHECK`

### POST `/api/tasks/:id/documents`
Task uchun PDF hujjat yuklash.

**So'rov:** (multipart/form-data)
- `file`: PDF fayl
- `name`: Hujjat nomi
- `description`: Ixtiyoriy tavsif
- `documentType`: `INVOICE`, `ST`, `FITO`, yoki `OTHER`

**Javob:**
```json
{
  "success": true,
  "document": {
    "id": 1,
    "name": "Invoice.pdf",
    "fileUrl": "/uploads/tasks/abc123.pdf",
    "documentType": "INVOICE"
  }
}
```

**Avtomatik qayta ishlash:**
- PDF'dan matn ajratadi
- Agar `INVOICE` yoki `ST` turi bo'lsa, AI yordamida avtomatik strukturizatsiya qiladi

### GET `/api/tasks/:id/ai-checks`
Task uchun AI tekshiruv natijalarini olish.

**Javob:**
```json
{
  "success": true,
  "checks": [
    {
      "id": 1,
      "checkType": "INVOICE_ST",
      "result": "PASS",
      "details": {
        "findings": [
          {
            "field": "product",
            "invoice_value": "Paxta",
            "st_value": "Paxta",
            "severity": "warning",
            "explanation": "Kichik yozuv farqi"
          }
        ]
      },
      "createdAt": "2025-12-25T10:00:00Z"
    }
  ]
}
```

## Muhit o'zgaruvchilari

`.env` fayliga qo'shing:
```
OPENAI_API_KEY=sizning_openai_api_key_ingiz
```

## Migration

Schema o'zgarishlarini qo'llash uchun migration'ni ishga tushiring:
```bash
cd backend
npx prisma migrate dev
```

Yoki qo'lda qo'llash:
```bash
psql -d prodeklarant -f prisma/migrations/20251225000000_add_ai_document_validation/migration.sql
```

## Asosiy biznes qoidalari

1. **AI HECH QACHON statuslarni to'g'ridan-to'g'ri o'zgartirmaydi**
   - AI faqat tahlil qiladi va topilmalarni qaytaradi
   - Backend qoidalari pass/fail qarorini qabul qiladi

2. **Status qaror qabul qilish logikasi:**
   - Har qanday kritik xato → `RETURNED`
   - Faqat ogohlantirishlar yoki xatolar bo'lmasa → `PASSED_AI_CHECK`

3. **Rol asosida kirish:**
   - `DEKLARANT`: Faqat o'zining filialidagi tasklarga kirish huquqiga ega
   - `ADMIN`/`MANAGER`: Barcha tasklarga kirish huquqiga ega

## Hujjat turlari

- **INVOICE**: Invoice hujjatlari
- **ST**: Kelib chiqish sertifikati (ST)
- **FITO**: Fitosanitariya sertifikati
- **OTHER**: Boshqa hujjatlar

## AI taqqoslash maydonlari

Taqqoslanadi:
- Mahsulot nomi
- Miqdori (5% tolerantlik)
- Eksportchi/Sotuvchi nomi
- Importchi/Xaridor nomi
- Yetkazib berish shartlari
- Sana mantiqiy mosligi

## Xatoliklar bilan ishlash

- Yetishmayotgan hujjatlar uchun aniq xato xabarlari
- AI muvaffaqiyatsizliklarida yumshoq ishlash (status saqlanadi, qo'lda tekshirish mumkin)
- Yuklash xatolarida fayl tozalash
- Muvaffaqiyatsizliklarda transaction rollback

## Test qilish

1. Invoice PDF yuklang → Statusni `INVOICE_READY` ga o'rnating
2. ST PDF yuklang → Statusni `ST_READY` ga o'rnating (AI taqqoslashni ishga tushiradi)
3. AI natijalarini `/api/tasks/:id/ai-checks` orqali tekshiring

## Ishlab chiqarish uchun ko'rsatmalar

- OpenAI API rate limitlari
- PDF fayl hajmi limitlari (50MB)
- Xatoliklar loglari va monitoring
- Xarajat optimizatsiyasi (gpt-4o-mini ishlatiladi)
- Ma'lumotlar bazasi indekslari samaradorlik uchun
