#!/bin/sh
# Backups de Postgres (docs/02, "Operación"): pg_dump diario en formato custom,
# 14 diarios + 8 semanales (el del domingo). Corre en el servicio `backup` de
# docker-compose.prod.yml; con --once hace uno solo y termina.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_HOUR="${BACKUP_HOUR:-4}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"

log() { echo "[backup $(date '+%F %T')] $*"; }

prune() {
  # Deja los $2 más nuevos de la carpeta $1.
  ls -1t "$1"/*.dump 2>/dev/null | tail -n +"$(($2 + 1))" | while read -r f; do
    rm -f -- "$f" && log "borrado $(basename "$f")"
  done
}

backup_once() {
  fecha=$(date +%F)
  mkdir -p "$BACKUP_DIR/diarios" "$BACKUP_DIR/semanales"
  destino="$BACKUP_DIR/diarios/biblioteca-$fecha.dump"
  tmp="$destino.tmp"

  pg_dump --format=custom --no-owner --file="$tmp"
  mv "$tmp" "$destino"
  log "ok: $(basename "$destino") ($(du -h "$destino" | cut -f1))"

  # Domingo: copia semanal.
  if [ "$(date +%u)" = "7" ]; then
    cp "$destino" "$BACKUP_DIR/semanales/"
  fi

  prune "$BACKUP_DIR/diarios" "$KEEP_DAILY"
  prune "$BACKUP_DIR/semanales" "$KEEP_WEEKLY"

  # Copia fuera de la VPS (configurable). Si falla, el backup local igual queda.
  if [ -n "${BACKUP_COPY_CMD:-}" ]; then
    if sh -c "$BACKUP_COPY_CMD"; then log "copia externa ok"; else log "ERROR en la copia externa"; fi
  fi
}

if [ "${1:-}" = "--once" ]; then
  backup_once
  exit 0
fi

log "programado todos los días desde las ${BACKUP_HOUR}:00"
ultimo=""
while true; do
  hoy=$(date +%F)
  hora=$(date +%H)
  if [ "$hoy" != "$ultimo" ] && [ "${hora#0}" -ge "$BACKUP_HOUR" ]; then
    if backup_once; then ultimo="$hoy"; else log "ERROR: el backup falló, se reintenta en 5 minutos"; fi
  fi
  sleep 300
done
