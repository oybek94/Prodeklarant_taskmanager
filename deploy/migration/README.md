# Yangi serverga ko'chish (Ubuntu 24.04)

Skriptlar **yangi serverda** ishlaydi va eski serverdan faqat o'qiydi. Ko'chirish hajmi ≈ 5 GB (uploads 3,1 GB, baza 74 MB).
Papkani yuborish: `scp -r deploy/migration root@<YANGI_IP>:/root/`

## A. Tayyorgarlik (eski server ishlayveradi, to'xtash yo'q)
1. `bash 01-setup-new-server.sh`
2. Yangida: `ssh-keygen -t ed25519 -N ''` → `cat ~/.ssh/id_ed25519.pub` ni ESKI serverning `/root/.ssh/authorized_keys` ga qo'shing (ko'chishdan keyin o'chiring).
3. `bash 02-pull-from-old.sh` (birinchisi uzoq; `tmux` ichida ishlating)
4. `bash 03-restore-db.sh` — Docker Postgres + dump/restore + qatorlar solishtiruvi
5. `bash 04-start-apps.sh` — standby rolida ishga tushadi (fon vazifalari o'chiq)
6. Sinov: kompyuteringizda `hosts` fayliga `<YANGI_IP> app.prodeklarant.uz` qo'shib, saytga kiring (login, hujjat yuklash, PDF, socket). Tugagach hosts qatorini o'chiring.
7. 24 soat oldin DNS TTL ni 300 s ga tushiring (app., prodeklarant.uz, www, alifbek).

## B. Ko'chish kuni (to'xtash ≈ 5–10 daqiqa, kechqurun)
1. ESKIda: `pm2 stop prodeklarant-backend order-bot && systemctl stop alifbek-api`
2. YANGIda: `bash 02-pull-from-old.sh && bash 03-restore-db.sh` (solishtiruv endi **to'liq bir xil** bo'lishi kerak)
3. YANGIda: `bash 05-set-role.sh primary`
4. DNS A yozuvlarini yangi IP ga o'tkazing → tekshiring.
5. Eski server **o'chirilmaydi**, to'xtatilgan holda qoladi (qaytish yo'li: eskida `pm2 start ...` + DNS ni qaytarish; yangida yozilgan ma'lumot yo'qolishini hisobga oling).

## C. Keyingi bosqich (alohida): eski server = zaxira
Postgres streaming replikatsiya (yangi → eski), uploads uchun muntazam rsync, failover (`05-set-role.sh primary` + DNS).

## Eslatmalar
- Bir vaqtda faqat BITTA serverda `primary` (bot/cron/order-bot dublikat bo'lmasligi uchun).
- Vaqt zonasi `Asia/Tashkent` (01 skript o'rnatadi) — kurs sanalari lokal yarim tunga bog'liq.
- Baza paroli `.env` dagi `DATABASE_URL` dan olinadi; ko'chishdan keyin almashtiring (`ALTER USER` + `.env`).
