#!/usr/bin/env bash
# YANGI serverda ishga tushiriladi. Eski serverdan faqat O'QIYDI (--delete ishlatilmaydi).
# Qayta-qayta ishga tushirish mumkin: 1-marta uzoq, keyingilari faqat farqni oladi.
set -euo pipefail
OLD="${OLD:-root@138.249.7.15}"
# Eski serverda paket yo'qolishi bor: qotgan ulanish tez uzilsin (--timeout) va tashqi retry sikli davom ettirsin.
SSH="ssh -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3"
rs() { rsync -aHz --partial --timeout=60 --info=progress2 -e "$SSH" "$@"; }

mkdir -p /var/www/certbot

# Asosiy ilova: kod, dist, .env, uploads (3 GB), order-bot. node_modules yangida qayta o'rnatiladi.
rs --exclude=node_modules "$OLD:/var/www/app/" /var/www/app/
rs --exclude=node_modules "$OLD:/var/www/prodeklarant.uz/" /var/www/prodeklarant.uz/
rs "$OLD:/var/www/alifbek/" /var/www/alifbek/

# SSL sertifikatlar (symlink'lar saqlanadi) — DNS o'tmasdan nginx ishlashi uchun
rs "$OLD:/etc/letsencrypt/" /etc/letsencrypt/

# nginx
for s in alifbek prodeklarant prodeklarant.uz; do
  rs "$OLD:/etc/nginx/sites-available/$s" "/etc/nginx/sites-available/$s"
  ln -sf "/etc/nginx/sites-available/$s" "/etc/nginx/sites-enabled/$s"
done
rm -f /etc/nginx/sites-enabled/default

# alifbek-api (systemd): unit, ishchi papka, env fayllar
rs "$OLD:/etc/systemd/system/alifbek-api.service" /etc/systemd/system/alifbek-api.service
WD="$($SSH "$OLD" "systemctl show -p WorkingDirectory --value alifbek-api")"
if [[ -n "$WD" && "$WD" != "/" ]]; then
  mkdir -p "$WD"; rs --exclude=node_modules "$OLD:$WD/" "$WD/"
fi
$SSH "$OLD" "systemctl show -p EnvironmentFiles --value alifbek-api" | awk '{print $1}' | sed 's/^-//' | while read -r f; do
  [[ -n "$f" ]] && { mkdir -p "$(dirname "$f")"; rs "$OLD:$f" "$f"; }
done
systemctl daemon-reload

echo "OK. alifbek-api ishchi papkasi: ${WD:-yoq}"
