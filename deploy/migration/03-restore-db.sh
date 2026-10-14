#!/usr/bin/env bash
# YANGI serverda: Docker Postgres 16 ni ko'taradi, eski bazadan pg_dump olib tiklaydi va qatorlar sonini solishtiradi.
# Eski bazaga faqat o'qish so'rovi yuboriladi. Qayta ishga tushirsa bazani tozalab qayta tiklaydi (--clean).
set -euo pipefail
OLD="${OLD:-root@138.249.7.15}"
SSH="ssh -o BatchMode=yes"
ENV_FILE=/var/www/app/backend/.env
DIR=/opt/prodeklarant
WORK=/root/migration
mkdir -p "$DIR" "$WORK"

# Baza foydalanuvchi/parol/nomi backend .env dagi DATABASE_URL dan olinadi (parol qayerga ham yozilmaydi/chiqarilmaydi)
read -r DB_USER DB_PASS DB_NAME DB_HOST < <(node -e '
const m=require("fs").readFileSync(process.argv[1],"utf8").match(/^DATABASE_URL=["\x27]?([^"\x27\r\n]+)/m);
const u=new URL(m[1]);
console.log([u.username,decodeURIComponent(u.password),u.pathname.slice(1),u.hostname+":"+(u.port||5432)].join(" "))' "$ENV_FILE")
[[ "$DB_HOST" == "localhost:5432" || "$DB_HOST" == "127.0.0.1:5432" ]] || { echo "DATABASE_URL hosti $DB_HOST — kutilgan 127.0.0.1:5432 emas, to'xtadim"; exit 1; }
[[ "$DB_PASS" != *"'"* ]] || { echo "Parolda ' belgisi bor, qo'lda sozlang"; exit 1; }

cat > "$DIR/docker-compose.yml" <<'YAML'
services:
  db:
    image: postgres:16-alpine
    container_name: prodeklarant-db
    restart: unless-stopped
    env_file: db.env
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
volumes:
  db_data:
YAML
umask 077
printf "POSTGRES_USER='%s'\nPOSTGRES_PASSWORD='%s'\nPOSTGRES_DB='%s'\n" "$DB_USER" "$DB_PASS" "$DB_NAME" > "$DIR/db.env"
umask 022

(cd "$DIR" && docker compose up -d db)
until docker exec prodeklarant-db pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do sleep 1; done

echo "== dump (eski serverdan) =="
$SSH "$OLD" "docker exec prodeklarant-db pg_dump -U $DB_USER -Fc $DB_NAME" > "$WORK/db.dump"
[[ -s "$WORK/db.dump" ]] || { echo "dump bo'sh!"; exit 1; }
ls -lh "$WORK/db.dump"

echo "== restore =="
docker exec -i prodeklarant-db pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner < "$WORK/db.dump" || echo "(pg_restore ogohlantirish berdi — pastdagi solishtirishga qarang)"

echo "== qatorlar soni solishtiruvi =="
cat > "$WORK/counts.sql" <<'SQL'
select table_name||' '||(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1;
SQL
$SSH "$OLD" "docker exec -i prodeklarant-db psql -U $DB_USER -d $DB_NAME -At" < "$WORK/counts.sql" > "$WORK/counts.old"
docker exec -i prodeklarant-db psql -U "$DB_USER" -d "$DB_NAME" -At < "$WORK/counts.sql" > "$WORK/counts.new"
if diff "$WORK/counts.old" "$WORK/counts.new"; then
  echo "BARCHA $(wc -l < "$WORK/counts.new") jadval bir xil."
else
  echo "FARQ bor (eski server hozir yozilayotgan bo'lsa — kutilgan; yakuniy ko'chishda eski to'xtatilgan bo'lishi shart)."
fi
