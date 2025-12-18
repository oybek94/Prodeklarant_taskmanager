# Email va Parol Test Qo'llanma

## Muammo:
Email va parol saqlanmayapti, Portal Access har doim "Yo'q" ko'rsatadi.

## Tuzatilgan:

### Backend (clients.ts):
1. ✅ Email validation - bo'sh string qabul qiladi
2. ✅ Password validation - bo'sh string qabul qiladi  
3. ✅ Console log qo'shildi - debug uchun
4. ✅ Data saqlash to'g'rilandi

### Test qilish bosqichlari:

#### 1. Backend loglarini tekshirish
Backend terminal'da quyidagi loglar chiqishi kerak:

**Yangi mijoz qo'shganda:**
```
Creating client with data: { name: '...', email: 'test@example.com', phone: '...', passwordHash: '[HIDDEN]' }
Client created successfully: { id: 3, email: 'test@example.com' }
```

**Mijozni tahrirlashda:**
```
Updating client 2 with data: { email: 'test@example.com', passwordHash: '[HIDDEN]' }
Client updated successfully: { id: 2, email: 'test@example.com' }
```

#### 2. Yangi mijoz qo'shish testi:

1. Admin panelda **Clients** sahifasiga o'ting
2. **Add New** tugmasini bosing
3. Ma'lumotlarni kiriting:
   ```
   Name: Test Mijoz
   Phone: +998901234567
   Email: test@example.com
   Parol: test123
   ```
4. **Saqlash** tugmasini bosing
5. Browser Console'ni oching (F12 -> Console)
6. Xatolik bormi tekshiring

**Kutilgan natija:**
- ✅ Mijoz saqlanadi
- ✅ Sahifa reload bo'ladi
- ✅ Yangi mijoz jadvalda ko'rinadi
- ✅ Email ustunida `test@example.com` ko'rinadi
- ✅ Portal Access ustunida "✅ Ha" ko'rinadi

#### 3. Mijozni tahrirlash testi:

1. Jadvalda yangi yaratilgan mijozni toping
2. **Edit** (o'zgartirish) tugmasini bosing
3. Modal oynada quyidagilar ko'rinishi kerak:
   ```
   Name: Test Mijoz
   Phone: +998901234567
   Email: test@example.com  ← Email to'ldirilgan bo'lishi kerak!
   Parol: (bo'sh)
   ```

**Kutilgan natija:**
- ✅ Email maydoni to'ldirilgan
- ✅ Parol maydoni bo'sh (xavfsizlik uchun)

#### 4. Emailni o'zgartirish testi:

1. Edit modalda emailni o'zgartiring: `test2@example.com`
2. **Saqlash** tugmasini bosing
3. Yana Edit tugmasini bosing
4. Email yangi qiymat bilan ko'rinishi kerak: `test2@example.com`

## Agar ishlamasa:

### Browser Console'da xatolik tekshirish:

1. F12 ni bosing (Developer Tools)
2. **Console** tabini oching
3. **Network** tabini oching
4. Mijoz qo'shish yoki tahrirlashni amalga oshiring
5. **clients** so'rovini toping va bosing
6. **Request Payload** ni tekshiring:
   ```json
   {
     "name": "Test Mijoz",
     "email": "test@example.com",
     "password": "test123",
     "phone": "+998901234567"
   }
   ```
7. **Response** ni tekshiring:
   ```json
   {
     "id": 3,
     "name": "Test Mijoz",
     "email": "test@example.com",
     "phone": "+998901234567",
     "active": true,
     "createdAt": "...",
     "updatedAt": "..."
   }
   ```

### Backend terminal loglarini tekshirish:

Terminal 9'da quyidagi commandni ishlating:
```bash
tail -f /Users/Oybek/.cursor/projects/Users-Oybek-Desktop-Prodeklarant/terminals/9.txt
```

Yoki Backend terminal'da yangi loglarni ko'ring.

### Agar validation xatosi bo'lsa:

Backend loglarida quyidagi xabar ko'rinishi mumkin:
```
Validation error: { ... }
```

Bu holda, email formati noto'g'ri yoki parol juda qisqa bo'lishi mumkin.

## Database'da tekshirish:

PostgreSQL'da quyidagi query'ni ishlating:
```sql
SELECT id, name, email, active, 
       CASE WHEN "passwordHash" IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as password_status
FROM "Client"
ORDER BY id DESC
LIMIT 5;
```

**Kutilgan natija:**
```
id | name        | email              | active | password_status
---+-------------+--------------------+--------+-----------------
3  | Test Mijoz  | test@example.com   | true   | SET
2  | ...         | ...                | true   | ...
```

## Agar hali ham ishlamasa:

1. Backend'ni qayta ishga tushiring:
   ```bash
   cd /Users/Oybek/Desktop/Prodeklarant/backend
   npm run dev
   ```

2. Frontend'ni qayta ishga tushiring:
   ```bash
   cd /Users/Oybek/Desktop/Prodeklarant/frontend
   npm run dev
   ```

3. Browser cache'ni tozalang:
   - Ctrl+Shift+Delete (Windows/Linux)
   - Cmd+Shift+Delete (Mac)
   - "Cached images and files" ni tanlang
   - "Clear data" ni bosing

4. Sahifani hard refresh qiling:
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

## Muvaffaqiyatli test:

✅ Email saqlanadi
✅ Portal Access "Ha" ko'rsatadi
✅ Edit modalda email to'ldirilgan ko'rinadi
✅ Mijoz portlaga kirishi mumkin: `http://localhost:5173/client/login`

---

**Oxirgi yangilanish:** 2025-12-18

