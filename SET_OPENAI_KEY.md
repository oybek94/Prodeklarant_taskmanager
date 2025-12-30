# OpenAI API Key o'rnatish

## Muammo
ST PDF yuklaganda quyidagi xatolik chiqmoqda:
```
AI structuring failed: 401 You didn't provide an API key...
```

## Yechim

### 1-usul: SSH orqali (Tavsiya etiladi)

Server'ga SSH orqali ulaning va quyidagi buyruqlarni bajaring:

```bash
ssh root@138.249.7.15
```

Keyin `.env` faylini tahrirlang:

```bash
nano /var/www/app/backend/.env
```

Yoki to'g'ridan-to'g'ri qo'shing:

```bash
echo "OPENAI_API_KEY=your_api_key_here" >> /var/www/app/backend/.env
```

Key'ni o'zgartirish kerak bo'lsa:

```bash
sed -i 's/OPENAI_API_KEY=.*/OPENAI_API_KEY=your_new_key_here/' /var/www/app/backend/.env
```

Backend'ni restart qiling:

```bash
pm2 restart prodeklarant-backend --update-env
```

### 2-usul: Python script orqali

Agar API key'ni o'z-o'zidan o'rnatmoqchi bo'lsangiz:

```bash
# Environment variable sifatida
export OPENAI_API_KEY="your_api_key_here"
python set_openai_key.py

# Yoki to'g'ridan-to'g'ri
OPENAI_API_KEY="your_api_key_here" python set_openai_key.py
```

### 3-usul: Qo'lda .env faylini tahrirlash

1. Server'ga SSH orqali ulaning
2. `.env` faylini oching: `nano /var/www/app/backend/.env`
3. `OPENAI_API_KEY=` qatorini toping va key'ni kiriting
4. Faylni saqlang (Ctrl+O, Enter, Ctrl+X)
5. Backend'ni restart qiling: `pm2 restart prodeklarant-backend --update-env`

## API Key olish

OpenAI API key'ni olish uchun:
1. https://platform.openai.com/account/api-keys ga kiring
2. "Create new secret key" tugmasini bosing
3. Key'ni nusxalang va xavfsiz joyda saqlang

## Tekshirish

Key o'rnatilganini tekshirish:

```bash
ssh root@138.249.7.15
grep OPENAI_API_KEY /var/www/app/backend/.env
```

Agar key ko'rsatilsa, o'rnatilgan.

## Eslatma

- API key'ni hech kimga bermang va GitHub'ga commit qilmang
- Key o'zgargan bo'lsa, backend'ni `--update-env` flag'i bilan restart qiling
- Key bo'sh bo'lsa, AI funksiyalari ishlamaydi, lekin dastur ishlashda davom etadi

