#!/usr/bin/env bash
# YANGI serverda: AI yordamchi uchun faqat-o'qish roli (ai_assistant) ni yaratadi.
# Rollar pg_dump ichiga kirmaydi, shuning uchun 03-restore-db.sh dagi GRANT'lar roldan oldin berilmaydi.
# Tartib: 03 (1-marta) -> 03b -> 03 (qayta, GRANT'lar o'tadi). Parol .env dagi READ_ONLY_DATABASE_URL dan olinadi.
set -euo pipefail
ENV_FILE=/var/www/app/backend/.env
read -r RO_USER RO_PASS < <(node -e '
const m=require("fs").readFileSync(process.argv[1],"utf8").match(/^READ_ONLY_DATABASE_URL=["\x27]?([^"\x27\r\n]+)/m);
if(!m){process.exit(1)}
const u=new URL(m[1]);console.log(u.username+" "+decodeURIComponent(u.password))' "$ENV_FILE")
set -a; source <(grep -E '^POSTGRES_(USER|DB)=' /opt/prodeklarant/db.env); set +a

docker exec -i prodeklarant-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -v ro_user="$RO_USER" -v ro_pass="$RO_PASS" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'ro_user', :'ro_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ro_user') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'ro_user', :'ro_pass') \gexec
SQL
echo "rol tayyor: $RO_USER"
