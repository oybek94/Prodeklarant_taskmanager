# Hosting Tavsiyalari

Bu dastur uchun quyidagi hosting xizmatlaridan foydalanishingiz mumkin.

## 1. VPS (Virtual Private Server) - Tavsiya etiladi ✅

VPS eng yaxshi variant, chunki:
- To'liq nazorat
- Node.js, PostgreSQL, Nginx o'rnatish mumkin
- Arzon narxlar
- Kuchli xususiyatlar

### Xalqaro VPS Provider'lar:

#### A) DigitalOcean 🌊
- **Narx:** $6/oy (1GB RAM, 1 vCPU) - $12/oy (2GB RAM, 1 vCPU) - **Tavsiya etiladi**
- **Xususiyatlar:**
  - SSD disk
  - Global data center'lar
  - Qulay panel
  - Yaxshi dokumentatsiya
- **Link:** https://www.digitalocean.com
- **O'zbekistondan:** To'lov kartasi orqali
- **Tavsiya:** 2GB RAM variant (dastur uchun yetarli)

#### B) Linode (Akamai) 🚀
- **Narx:** $5/oy (1GB RAM) - $12/oy (2GB RAM)
- **Xususiyatlar:**
  - Tez va barqaror
  - Yaxshi mijoz xizmati
- **Link:** https://www.linode.com

#### C) Vultr ⚡
- **Narx:** $6/oy (1GB RAM) - $12/oy (2GB RAM)
- **Xususiyatlar:**
  - Ko'p data center'lar
  - Tez SSD
  - Oson boshqaruv
- **Link:** https://www.vultr.com

#### D) Hetzner 🇩🇪
- **Narx:** €4.15/oy (~$4.5) (2GB RAM) - **Eng arzon!**
- **Xususiyatlar:**
  - Juda arzon
  - Yaxshi xususiyatlar
  - Yevropa data center'lar
- **Link:** https://www.hetzner.com
- **Eslatma:** Yevropa data center, lekin juda arzon

#### E) AWS Lightsail ☁️
- **Narx:** $3.50/oy (512MB) - $5/oy (1GB) - $10/oy (2GB)
- **Xususiyatlar:**
  - Amazon xizmati
  - Qulay panel
  - Backup xizmatlari
- **Link:** https://aws.amazon.com/lightsail

### O'zbekiston va Markaziy Osiyo:

#### A) BigServer 🇺🇿
- **Narx:** ~$5-15/oy
- **Xususiyatlar:**
  - O'zbekistonda joylashgan
  - Node.js qo'llab-quvvatlaydi
  - TAS-IX tarmog'iga ulangan (tez)
  - O'zbek tilida qo'llab-quvvatlash
- **Link:** https://bigserver.uz
- **Tavsiya:** O'zbekistondan foydalanish uchun

#### B) PS Cloud Services 🇺🇿
- **Narx:** ~$5-20/oy (VPS)
- **Xususiyatlar:**
  - VPS xizmatlari
  - Plesk panel
  - O'zbekistonda joylashgan
- **Link:** https://pscloud.uz/hosting/vps

#### C) Sharq Telekom (ST.uz) 🇺🇿
- **Narx:** ~$10-30/oy
- **Xususiyatlar:**
  - VDS virtual serverlar
  - O'zbekistonda joylashgan
  - Yaxshi xizmat
- **Link:** https://st.uz/uz/home/hosting

#### D) Domains.uz 🇺🇿
- **Narx:** ~$5-15/oy
- **Xususiyatlar:**
  - NVMe disklar (tez)
  - O'zbekistonda joylashgan
  - TAS-IX tarmog'iga ulangan
- **Link:** https://domains.uz

#### E) Timeweb 🇷🇺
- **Narx:** ~$5-10/oy
- **Xususiyatlar:**
  - Rus tilida qo'llab-quvvatlash
  - Yaxshi xizmat
- **Link:** https://timeweb.com

#### F) Beget 🇷🇺
- **Narx:** ~$4-8/oy
- **Xususiyatlar:**
  - Arzon narxlar
  - Yaxshi xizmat
- **Link:** https://beget.com

## 2. Cloud Platform'lar (PaaS)

### A) Railway 🚂
- **Narx:** $5/oy (starter) - $20/oy (pro)
- **Xususiyatlar:**
  - Oson deployment
  - PostgreSQL built-in
  - GitHub integration
  - Auto-deploy
- **Link:** https://railway.app
- **Tavsiya:** Kichik loyihalar uchun

### B) Render 🎨
- **Narx:** $7/oy (Web Service) + $7/oy (PostgreSQL)
- **Xususiyatlar:**
  - Oson sozlash
  - Free tier mavjud (cheklangan)
  - Auto-deploy
- **Link:** https://render.com

### C) Fly.io 🪰
- **Narx:** Pay-as-you-go
- **Xususiyatlar:**
  - Global deployment
  - Oson scaling
- **Link:** https://fly.io

### D) Heroku ☁️
- **Narx:** $7/oy (Basic) + $5/oy (PostgreSQL)
- **Xususiyatlar:**
  - Juda oson deployment
  - Ko'p add-on'lar
- **Link:** https://www.heroku.com
- **Eslatma:** Narxi biroz qimmat

## 3. Shared Hosting (Tavsiya etilmaydi ❌)

Shared hosting'da Node.js va PostgreSQL ishlatish qiyin yoki mumkin emas. Faqat PHP dasturlar uchun.

## 4. Tavsiyalar

### Kichik loyiha uchun (10-50 foydalanuvchi):
- **DigitalOcean:** $12/oy (2GB RAM)
- **Hetzner:** €4.15/oy (2GB RAM) - **Eng arzon**
- **Railway:** $5-10/oy

### O'rta loyiha uchun (50-200 foydalanuvchi):
- **DigitalOcean:** $24/oy (4GB RAM)
- **Vultr:** $24/oy (4GB RAM)
- **AWS Lightsail:** $20/oy (4GB RAM)

### Katta loyiha uchun (200+ foydalanuvchi):
- **DigitalOcean:** $48/oy (8GB RAM)
- **AWS EC2:** Pay-as-you-go
- **Google Cloud Platform:** Pay-as-you-go

## 5. Mening Tavsiyam 🎯

### O'zbekistondan foydalanish uchun:
**BigServer yoki Domains.uz (O'zbekistonda joylashgan)**
- ✅ TAS-IX tarmog'iga ulangan (juda tez)
- ✅ O'zbek tilida qo'llab-quvvatlash
- ✅ O'zbekistondan to'lov oson
- ✅ Node.js qo'llab-quvvatlaydi
- **Narx:** ~$5-15/oy

### Xalqaro (Eng yaxshi balans):
**DigitalOcean - 2GB RAM ($12/oy)**
- ✅ Qulay panel
- ✅ Yaxshi dokumentatsiya
- ✅ Global data center'lar
- ✅ Yaxshi mijoz xizmati
- ✅ O'zbekistondan to'lov oson

### Eng arzon variant:
**Hetzner - 2GB RAM (€4.15/oy ~ $4.5)**
- ✅ Juda arzon
- ✅ Yaxshi xususiyatlar
- ⚠️ Yevropa data center (O'zbekistondan biroz sekin bo'lishi mumkin)

### Eng oson variant (Kod yozmasdan):
**Railway ($5-10/oy)**
- ✅ GitHub'dan avtomatik deploy
- ✅ PostgreSQL built-in
- ✅ Oson sozlash

## 6. Qo'shimcha Xarajatlar

1. **Domain:** $10-15/yil (Namecheap, GoDaddy)
2. **SSL:** Bepul (Let's Encrypt)
3. **Backup:** VPS'da o'zingiz qilasiz (bepul)

## 7. O'zbekistondan To'lov

### Qulay to'lov usullari:
- **DigitalOcean:** Visa/Mastercard
- **Vultr:** Visa/Mastercard, PayPal
- **Hetzner:** Visa/Mastercard, PayPal
- **Railway:** Visa/Mastercard, PayPal

### Maslahat:
- Avval eng arzon variantni (Hetzner) sinab ko'ring
- Agar muammo bo'lsa, DigitalOcean'ga o'ting
- Kichik loyiha uchun Railway ham yaxshi variant

## 8. Server Talablari (Minimum)

- **RAM:** 2GB (1GB ham ishlaydi, lekin sekin)
- **CPU:** 1 vCPU
- **Disk:** 20GB SSD
- **Traffic:** 1TB/oy (odatda yetarli)

## 9. Qadam-baqadam

1. **Hosting tanlang** (masalan: DigitalOcean)
2. **VPS yarating** (Ubuntu 22.04 yoki 20.04)
3. **SSH orqali ulaning**
4. **`PRODUCTION_DEPLOYMENT.md`** dagi ko'rsatmalarga amal qiling

## 10. Tekshirish

Hosting tanlaganingizdan keyin:
- Server IP manzilini oling
- Domain'ni DNS'ga ulang
- `PRODUCTION_DEPLOYMENT.md` dagi qadamlarni bajaring

---

**Maslahat:** Avval eng arzon variantni (Hetzner) sinab ko'ring. Agar muammo bo'lsa, DigitalOcean'ga o'ting. Ikkalasi ham yaxshi ishlaydi! 🚀

