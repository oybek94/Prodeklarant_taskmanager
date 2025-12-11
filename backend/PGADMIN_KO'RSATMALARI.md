# pgAdmin'ga Kirish va SQL Bajarish Ko'rsatmasi

## 1. pgAdmin'ni Ochish

### Windows'da:
1. **Start** tugmasini bosing
2. **pgAdmin 4** yoki **pgAdmin** qidiring
3. pgAdmin'ni oching

Yoki:
- Desktop'da **pgAdmin 4** shortcut'ini bosing
- Yoki **Windows Search**'da "pgAdmin" yozing

## 2. pgAdmin'ga Ulanish

1. pgAdmin ochilganda, chap tomonda **Servers** ko'rinadi
2. **Servers** ni kengaytiring (bosing)
3. **PostgreSQL 16** (yoki sizning versiyangiz) ni kengaytiring
4. Parol so'raladi - PostgreSQL'ni o'rnatishda kiritgan parolni kiriting
5. Ulanish muvaffaqiyatli bo'lsa, **Databases** ko'rinadi

## 3. Database'ni Tanlash

1. **Databases** ni kengaytiring
2. **prodeklarant** database'ni toping
3. **prodeklarant** ustiga **o'ng boshing** (right click)
4. **Query Tool** ni tanlang

## 4. SQL'ni Bajarish

1. **Query Tool** ochiladi (o'ng tomonda)
2. `backend/fix-roles.sql` faylini oching
3. Barcha SQL kodini **nusxalang** (Ctrl+A, keyin Ctrl+C)
4. Query Tool'dagi bo'sh maydonga **yopishtiring** (Ctrl+V)
5. **Execute** tugmasini bosing (yoki **F5** tugmasini bosing)

## 5. Natijani Tekshirish

SQL muvaffaqiyatli bajarilganda:
- Pastki qismda "Success" yoki "Query returned successfully" ko'rinadi
- Xatolik bo'lsa, qizil rangda xatolik xabari ko'rinadi

## 6. Tekshirish

Yangi Query Tool ochib, quyidagi SQL'ni bajarib tekshiring:

```sql
SELECT DISTINCT role FROM "User";
```

Natija: faqat `ADMIN` va `DEKLARANT` ko'rsatilishi kerak.

## Muammo Bo'lsa

- Agar parolni unutgan bo'lsangiz, PostgreSQL service'ni qayta ishga tushirish kerak bo'lishi mumkin
- Agar database topilmasa, avval database yaratilganligini tekshiring
- Agar Query Tool topilmasa, **Tools** menyusidan **Query Tool** ni tanlang

