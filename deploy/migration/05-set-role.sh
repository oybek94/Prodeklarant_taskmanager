#!/usr/bin/env bash
# Serverning rolini almashtiradi:  ./05-set-role.sh primary|standby
#   primary — cron, schedulerlar, botlar, order-bot, alifbek-api ishlaydi
#   standby — API ishlaydi, lekin fon vazifalari/botlar/order-bot/alifbek-api o'chiq
# MUHIM: bir vaqtda faqat BITTA serverda primary bo'lsin (aks holda dublikat xabarlar, Telegram 409).
set -euo pipefail
ROLE="${1:?primary yoki standby}"; FIRST="${2:-}"
[[ "$ROLE" == primary || "$ROLE" == standby ]] || { echo "primary|standby"; exit 1; }
B=/var/www/app/backend/.env

set_env() { if grep -q "^$2=" "$1"; then sed -i "s|^$2=.*|$2=$3|" "$1"; else printf '\n%s=%s\n' "$2" "$3" >> "$1"; fi; }
set_env "$B" INSTANCE_ROLE "$ROLE"
echo "FINANCE_BOT_ENABLED hozir: $(grep '^FINANCE_BOT_ENABLED=' "$B" || echo 'yo'\''q (bot o'\''chiq)')"

start_or_restart() { # name cwd script
  if pm2 describe "$1" >/dev/null 2>&1; then pm2 restart "$1" --update-env; else pm2 start "$3" --name "$1" --cwd "$2"; fi
}
start_or_restart prodeklarant-backend /var/www/app/backend dist/server.js
start_or_restart prodeklarant /var/www/prodeklarant.uz server/index.js

if [[ "$ROLE" == primary ]]; then
  start_or_restart order-bot /var/www/app/order-bot dist/index.js
  systemctl enable --now alifbek-api
else
  pm2 delete order-bot >/dev/null 2>&1 || true
  systemctl disable --now alifbek-api >/dev/null 2>&1 || true
fi
pm2 save >/dev/null
echo "Rol: $ROLE"
