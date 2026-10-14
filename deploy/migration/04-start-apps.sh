#!/usr/bin/env bash
# YANGI serverda: bog'liqliklarni o'rnatadi, pm2 jarayonlarini yaratadi, nginx ni yoqadi.
# Boshida STANDBY rolida ishga tushadi (cron/bot/order-bot/alifbek-api o'chiq) — xavfsiz sinov uchun.
set -euo pipefail
cd /var/www/app/backend
npm ci --no-audit --no-fund
npx prisma generate

# Eski serverdan kelgan dist'da INSTANCE_ROLE o'chirgichi YO'Q — kodni pull qilib qayta build qilamiz.
# (server.ts dagi o'zgarish main'ga push qilingan bo'lishi shart; aks holda to'xtaymiz — standby'da cron ishlab ketmasin.)
git -C /var/www/app pull --ff-only origin main
npm run build
grep -q INSTANCE_ROLE dist/server.js || { echo "dist da INSTANCE_ROLE yo'q — o'zgarish hali push qilinmagan. To'xtadim."; exit 1; }
(cd /var/www/app/order-bot && npm ci --no-audit --no-fund)
(cd /var/www/prodeklarant.uz && [[ -f package-lock.json ]] && npm ci --omit=dev --no-audit --no-fund || true)
# landing'ning Express qismi (dotenv va b.) server/ ichidagi alohida package.json da
(cd /var/www/prodeklarant.uz/server && [[ -f package-lock.json ]] && npm ci --omit=dev --no-audit --no-fund || true)
WD="$(systemctl show -p WorkingDirectory --value alifbek-api)"
[[ -n "$WD" && -f "$WD/package-lock.json" ]] && (cd "$WD" && npm ci --omit=dev --no-audit --no-fund) || true

# Rol .env ga yoziladi va jarayonlar boshlanadi
"$(dirname "$0")/05-set-role.sh" standby --first-start

nginx -t && systemctl reload nginx

echo "== tekshiruv =="
sleep 4
pm2 list
ss -ltn | grep -E ':(3001|3002|8787) ' || echo "OGOHLANTIRISH: 3001/3002/8787 portlaridan biri tinglamayapti (pm2 logs ko'ring)"
curl -s -o /dev/null -w "backend /api: HTTP %{http_code}\n" http://127.0.0.1:3001/health || true
