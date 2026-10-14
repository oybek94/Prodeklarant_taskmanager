#!/usr/bin/env bash
# ESKI serverda ishga tushiriladi:  06-old-server-handoff.sh apply | rollback
#   apply    — nginx ni YANGI serverga teskari proksiga aylantiradi (DNS keshi eski IP ni ushlab turgan mijozlar ham
#              yangi serverga tushadi, ma'lumot bo'linmaydi). Eski ilovalar OLDINDAN to'xtatilgan bo'lishi shart.
#   rollback — eski nginx sayt konfiglarini qaytaradi (sites-available fayllariga tegilmaydi).
#   selftest — yangi serverda sinov: alohida portlarda vaqtinchalik nginx ko'taradi (apply ishlatilmaydi).
set -euo pipefail
MODE="${1:?apply|rollback|selftest}"
NEW="${NEW:-46.8.114.92}"
AV=/etc/nginx/sites-available; EN=/etc/nginx/sites-enabled
OLD_SITES=(alifbek prodeklarant prodeklarant.uz)

render() { # out_dir target sslport httpport
  local out="$1" target="$2" sslp="$3" httpp="$4"
  mkdir -p "$out"
  cat > "$out/handoff-map.conf" <<'EOF'
map $http_upgrade $connection_upgrade { default upgrade; '' close; }
EOF
  : > "$out/handoff"
  block() { # hosts cert
    sed -e "s|@TARGET@|$target|g" -e "s|@SSLP@|$sslp|g" -e "s|@HTTPP@|$httpp|g" -e "s|@HOSTS@|$1|g" -e "s|@CERT@|$2|g" >> "$out/handoff" <<'EOF'
server {
    listen @HTTPP@;
    listen [::]:@HTTPP@;
    server_name @HOSTS@;
    location /.well-known/acme-challenge/ {
        proxy_pass https://@TARGET@;
        proxy_ssl_server_name on;
        proxy_ssl_name $host;
        proxy_ssl_session_reuse off;
        proxy_ssl_verify on;
        proxy_ssl_verify_depth 2;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
        proxy_set_header Host $host;
    }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen @SSLP@ ssl;
    listen [::]:@SSLP@ ssl;
    server_name @HOSTS@;
    ssl_certificate /etc/letsencrypt/live/@CERT@/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/@CERT@/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    client_max_body_size 200M;
    location / {
        proxy_pass https://@TARGET@;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_ssl_name $host;
        proxy_ssl_session_reuse off;
        proxy_ssl_verify on;
        proxy_ssl_verify_depth 2;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_connect_timeout 15s;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_request_buffering off;
    }
}
EOF
  }
  block "app.prodeklarant.uz" "app.prodeklarant.uz"
  block "prodeklarant.uz www.prodeklarant.uz" "prodeklarant.uz"
  block "alifbek.prodeklarant.uz" "alifbek.prodeklarant.uz"
}

do_rollback() {
  rm -f "$EN/handoff" /etc/nginx/conf.d/handoff-map.conf
  for s in "${OLD_SITES[@]}"; do ln -sf "$AV/$s" "$EN/$s"; done
  nginx -t && systemctl reload nginx && echo "ROLLBACK OK: eski nginx konfiglari qaytarildi"
}

case "$MODE" in
  apply)
    render /root/handoff-render "$NEW" 443 80
    cp /root/handoff-render/handoff "$AV/handoff"
    cp /root/handoff-render/handoff-map.conf /etc/nginx/conf.d/handoff-map.conf
    for s in "${OLD_SITES[@]}"; do rm -f "$EN/$s"; done
    ln -sf "$AV/handoff" "$EN/handoff"
    if nginx -t && systemctl reload nginx; then echo "APPLY OK: eski server endi $NEW ga proksi qiladi"; else echo "nginx -t xato — qaytaryapman"; do_rollback; exit 1; fi
    ;;
  rollback) do_rollback ;;
  selftest)
    T="$(mktemp -d /tmp/hc.XXXXXX)"; chmod 700 "$T"   # taxmin qilinadigan /tmp yo'li (symlink hujumi) o'rniga
    render "$T" 127.0.0.1 9443 9080
    cat > "$T/nginx.conf" <<EOF
pid $T/n.pid; error_log $T/err.log; events {}
# Vaqtinchalik nginx haqiqiy nginx ning /var/lib/nginx/* papkalariga (egasi www-data) TEGMASLIGI uchun
http { access_log $T/acc.log; proxy_temp_path $T/p; client_body_temp_path $T/b; fastcgi_temp_path $T/f; uwsgi_temp_path $T/u; scgi_temp_path $T/s; include $T/handoff-map.conf; include $T/handoff; }
EOF
    nginx -t -c "$T/nginx.conf" && nginx -c "$T/nginx.conf" && sleep 1
    for h in app.prodeklarant.uz prodeklarant.uz alifbek.prodeklarant.uz; do
      curl -s -k -o /dev/null --max-time 15 --resolve "$h:9443:127.0.0.1" -w "$h -> HTTP %{http_code}\n" "https://$h:9443/"
    done
    curl -s -k --max-time 15 --resolve app.prodeklarant.uz:9443:127.0.0.1 https://app.prodeklarant.uz:9443/api/health/db; echo
    curl -s -k --max-time 15 --resolve app.prodeklarant.uz:9443:127.0.0.1 "https://app.prodeklarant.uz:9443/socket.io/?EIO=4&transport=polling" | head -c 60; echo
    kill "$(cat "$T/n.pid")"; rm -rf "$T"; echo "selftest tugadi"
    ;;
  *) echo "apply|rollback|selftest"; exit 1 ;;
esac
