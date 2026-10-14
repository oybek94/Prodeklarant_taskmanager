#!/usr/bin/env bash
# YANGI serverda (Ubuntu 24.04, root) ishga tushiriladi. Qayta ishga tushirsa ham xavfsiz.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# MUHIM: eski server Asia/Tashkent (+05). Kurs sanalari va cron lokal yarim tunga bog'liq.
timedatectl set-timezone Asia/Tashkent

apt-get update
apt-get -y upgrade
apt-get install -y ca-certificates curl git rsync ufw fail2ban nginx certbot python3-certbot-nginx \
  docker.io docker-compose-v2 build-essential

# Node 20 (eskisida v20.19.6)
if ! command -v node >/dev/null || [[ "$(node -v)" != v20.* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm i -g pm2@6.0.14
pm2 install pm2-logrotate >/dev/null || true
pm2 startup systemd -u root --hp /root >/dev/null || true

# Firewall: faqat ssh + web. Postgres (5432) hech qachon ochilmaydi.
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban docker nginx

# Jurnal 4 GB gacha o'smasligi uchun (eski serverda shunday bo'lgan)
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=200M\n' > /etc/systemd/journald.conf.d/size.conf
systemctl restart systemd-journald

# 2 GB swap (RAM 4 GB, build paytida kerak bo'ladi)
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "OK. Keyingi qadam: ssh-keygen -t ed25519 (parolsiz), public kalitni ESKI serverning authorized_keys ga qo'shing."
