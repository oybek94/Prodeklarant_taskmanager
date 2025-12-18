# Mijoz Portali Qo'llanma

## O'rnatilgan Funksiyalar

Mijozlar uchun maxsus portal yaratildi. Mijozlar o'z loyihalarini kuzatish, hujjatlarni ko'rish va umumiy statistikalarni ko'rishlari mumkin.

## Admin uchun: Mijozga Kirish Berish

### 1. Mijozni yaratish yoki tahrirlash

Admin panelida:
1. **Clients** bo'limiga o'ting
2. Mijozni tanlang yoki yangi mijoz yarating
3. Mijoz ma'lumotlariga quyidagilarni qo'shing:
   - **Email** (majburiy - kirish uchun kerak)
   - **Parol** (majburiy - kirish uchun kerak)
   - **Telefon** (ixtiyoriy)

### 2. Mijozga parol berish

Mijoz uchun parol yaratganingizda, uni mijozga xabar qiling:
```
Email: mijoz@example.com
Parol: ********
Portal: http://your-domain.com/client/login
```

## Mijoz uchun: Portaldan foydalanish

### Kirish

1. Brauzerda ochish: `http://your-domain.com/client/login`
2. Email va parolni kiriting
3. "Kirish" tugmasini bosing

### Dashboard (Asosiy sahifa)

Dashboard'da quyidagi ma'lumotlar ko'rsatiladi:

#### Statistika:
- **Jami loyihalar** - Barcha loyihalar soni
- **Yakunlangan** - Tugallangan loyihalar soni
- **Jarayonda** - Hozir bajarilayotgan loyihalar
- **O'rtacha muddat** - Bir loyiha uchun o'rtacha vaqt (kunlarda)

#### Moliyaviy ma'lumotlar:
- **Umumiy summa** - Barcha loyihalar uchun umumiy summa
- **To'langan** - Siz to'lagan summa
- **Balans** - Qarz yoki ortiqcha to'lov (qizil - qarz, yashil - ortiqcha)

### Loyihalar ro'yxati

"Loyihalarim" tugmasini bosing:

#### Qidiruv:
- Loyiha nomini yozib qidiruv qilish mumkin
- Status bo'yicha filtrlash (Boshlanmagan, Jarayonda, Tayyor, va h.k.)

#### Excel export:
- "Excel ga yuklash" tugmasi orqali barcha loyihalarni Excel faylga yuklash mumkin
- Fayl nomi: `Loyihalarim_2025-12-18.xlsx`
- Quyidagi ma'lumotlar kiritiladi:
  - ID
  - Nomi
  - Status
  - Filial
  - Summa
  - Jarayonlar (masalan: 5/9)
  - Progress (%)
  - PSR (Ha/Yo'q)
  - Yaratilgan sana
  - Izoh

### Loyiha tafsilotlari

Loyihaga bosinganda quyidagi ma'lumotlar ko'rsatiladi:

#### Asosiy ma'lumotlar:
- Loyiha nomi
- Status
- Filial
- Yaratilgan va yangilangan sana
- Summa
- PSR (bor/yo'q)
- Izohlar

#### Jarayonlar (Timeline):
- Har bir bosqichning holati
- Tayyor bosqichlar yashil rangda
- Tugallanmagan bosqichlar kulrang
- Har bir bosqich uchun tugallangan sana

#### Hujjatlar:
- Loyihaga tegishli barcha hujjatlar
- Hujjat nomi, hajmi, yuklangan sana
- Hujjatni ochish uchun hujjatga bosing
- Hujjatlar yangi tabda ochiladi

### Chiqish

O'ng yuqori burchakdagi "Chiqish" tugmasini bosing.

## Xavfsizlik

### Parolni o'zgartirish:
Hozircha mijoz o'zi parolni o'zgartira olmaydi. Admin orqali parolni yangilash kerak.

### Token autentifikatsiya:
- Har safar kirganda token beriladi
- Token 1 soat amal qiladi
- Refresh token 7 kun amal qiladi
- Xavfsiz saqlash uchun localStorage ishlatiladi

## API Endpoints (Backend)

Mijoz portali quyidagi API endpointlardan foydalanadi:

```
POST   /api/client/login           - Kirish
GET    /api/client/dashboard       - Dashboard statistikalari
GET    /api/client/tasks           - Loyihalar ro'yxati (search va status filter)
GET    /api/client/tasks/:id       - Loyiha tafsilotlari va hujjatlar
```

## Frontend Routes

```
/client/login              - Kirish sahifasi
/client/dashboard          - Dashboard (statistikalar)
/client/tasks              - Loyihalar ro'yxati
/client/tasks/:id          - Loyiha tafsilotlari
```

## Texnik tafsilotlar

### Database o'zgarishlari:
Client jadvalidagi yangi ustunlar:
- `email` (String?, unique) - Kirish uchun email
- `passwordHash` (String?) - Bcrypt bilan hashlangan parol
- `active` (Boolean, default: true) - Faollik holati

### Frontend kutubxonalar:
- `xlsx` - Excel export uchun
- `axios` - API so'rovlar uchun
- `react-router-dom` - Routing uchun

### Xavfsizlik:
- Parollar bcrypt bilan hashlanadi
- JWT token autentifikatsiya
- Client faqat o'z loyihalarini ko'rishi mumkin
- Har bir API so'rovda token tekshiriladi

## Kelajakdagi rivojlantirish

- [ ] Mijoz profil sahifasi (parolni o'zgartirish)
- [ ] Hujjat yuklash imkoniyati mijoz tomonidan
- [ ] Email bildirishnomalar (loyiha yangilanganda)
- [ ] Loyiha bo'yicha chat yoki izohlar
- [ ] Mobile responsive dizayn yaxshilash
- [ ] PDF export funksiyasi
- [ ] To'lovlar tarixi

## Qo'llab-quvvatlash

Muammo yuzaga kelsa:
1. Backend loglarini tekshiring: `/Users/Oybek/Desktop/Prodeklarant/backend`
2. Frontend console'ni tekshiring (F12 -> Console)
3. Database'da Client jadvalidagi ma'lumotlarni tekshiring

## Test qilish

1. Admin panelida yangi mijoz yarating
2. Email va parol bering
3. `/client/login` sahifasiga o'ting
4. Yaratilgan email va parol bilan kiring
5. Dashboard va loyihalar sahifalarini tekshiring

---

**Tayyorlandi:** 2025-12-18
**Versiya:** 1.0

