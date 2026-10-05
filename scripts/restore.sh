#!/bin/sh
# Restaura un backup hecho por backup.sh. REEMPLAZA el contenido de la base destino.
#   docker compose -f docker-compose.prod.yml stop app worker
#   docker compose -f docker-compose.prod.yml run --rm --entrypoint /bin/sh backup \
#     /scripts/restore.sh /backups/diarios/biblioteca-AAAA-MM-DD.dump
#   docker compose -f docker-compose.prod.yml start app worker
# Usa PGHOST/PGUSER/PGPASSWORD/PGDATABASE del entorno (PGDATABASE = base destino).
set -eu

archivo="${1:?Uso: restore.sh <archivo.dump>}"
[ -f "$archivo" ] || { echo "No existe $archivo"; exit 1; }

echo "Restaurando $archivo en la base '$PGDATABASE' de $PGHOST…"
pg_restore --clean --if-exists --no-owner --exit-on-error --dbname="$PGDATABASE" "$archivo"
echo "Listo."
