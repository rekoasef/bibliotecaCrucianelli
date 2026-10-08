# Despliegue en la VPS

Todo corre con `docker-compose.prod.yml`: Postgres, migraciones, app (Next.js), worker (extracción de texto + detección de cambios en Drive), Caddy (HTTPS automático) y backups.

## Requisitos

- VPS con Docker y Docker Compose.
- Un dominio o subdominio con un registro A apuntando a la VPS, y los puertos 80 y 443 abiertos. Con Caddy el certificado sale solo; si la VPS ya tiene Nginx, ver "Con el Nginx de la VPS".
- Archivos de Drive compartidos con "Cualquier persona con el vínculo" (no hace falta Google Cloud; ver `docs/08-google-drive-y-smtp.md`).
- Datos del SMTP de la empresa.
- Ancho de banda de subida suficiente: los PDFs y planos pasan por la VPS (los videos con link público, no).

## Primer despliegue

```bash
git clone https://github.com/rekoasef/bibliotecaCrucianelli.git
cd bibliotecaCrucianelli
cp .env.production.example .env.production   # completar todo
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

`--env-file` hace falta además del `env_file` de cada servicio: con él Compose completa `${DOMAIN}`, `${POSTGRES_PASSWORD}`, etc.

Al arrancar, el servicio `migrate` aplica las migraciones y termina; recién ahí arrancan `app` y `worker`.

Crear el admin inicial (manda la invitación a `ADMIN_EMAIL`) y cargar máquinas y taxonomía de `docs/04`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  run --rm migrate npx tsx --conditions=react-server src/db/seed.ts
```

Verificar: `https://<dominio>/api/health` responde `{"ok":true}` y `docker compose -f docker-compose.prod.yml ps` muestra `app` como `healthy`.

## Actualizar

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Las migraciones nuevas se aplican solas antes de reiniciar la app.

## Logs

```bash
docker compose -f docker-compose.prod.yml logs -f app      # o worker, proxy, backup
```

Docker rota los logs (5 archivos de 10 MB por servicio).

## Backups

- El servicio `backup` hace un `pg_dump` por día a partir de `BACKUP_HOUR` (4 AM por defecto) en `BACKUP_DIR` (`./backups`): 14 diarios en `diarios/` y 8 semanales (los del domingo) en `semanales/`.
- **Copia fuera de la VPS:** `BACKUP_COPY_CMD` se ejecuta después de cada backup. Ejemplo con rclone ya configurado: `BACKUP_COPY_CMD=rclone sync /backups remoto:biblioteca-backups` (en ese caso hay que montar la config de rclone en el servicio, o usar una imagen con rclone). Sin esto, los backups quedan solo en la VPS.
- Backup manual: `docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backup --once`.

### Restaurar

```bash
docker compose -f docker-compose.prod.yml stop app worker
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint /bin/sh backup \
  /scripts/restore.sh /backups/diarios/biblioteca-AAAA-MM-DD.dump
docker compose -f docker-compose.prod.yml start app worker
```

**Antes de salir a producción, probar la restauración en la VPS** (docs/02). Para no tocar la base real, restaurar en una base aparte:

```bash
docker compose -f docker-compose.prod.yml exec db createdb -U biblioteca prueba_restore
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint /bin/sh \
  -e PGDATABASE=prueba_restore backup /scripts/restore.sh /backups/diarios/<último>.dump
docker compose -f docker-compose.prod.yml exec db psql -U biblioteca -d prueba_restore -c "select count(*) from documentos"
docker compose -f docker-compose.prod.yml exec db dropdb -U biblioteca prueba_restore
```

(Este procedimiento se probó en desarrollo: misma cantidad de filas en todas las tablas e índice de búsqueda funcionando en la base restaurada.)

## Con el Nginx de la VPS

La VPS de la empresa ya tiene Nginx (con otra app), así que no se usa Caddy: se agrega `docker-compose.nginx.yml`, que desactiva el servicio `proxy` y publica la app solo en `127.0.0.1:${APP_PORT}` (3010 por defecto; cambiarlo en `.env.production` si está ocupado).

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml --env-file .env.production up -d --build
```

Todos los comandos de este README llevan entonces los dos `-f` (actualizar, seed, logs, backups). Para no repetirlos, en la VPS se puede dejar en el `.env` de la carpeta (el que Compose lee solo):

```bash
COMPOSE_FILE=docker-compose.prod.yml:docker-compose.nginx.yml
```

Nginx: partir de `deploy/nginx.conf.example` (dominio, puerto) y sacar el certificado con `certbot --nginx`. Importante:

- `X-Forwarded-For` se **reemplaza** con la IP real (`$remote_addr`), no se agrega: la app la usa para limitar intentos de login y descargas sin cuenta. Con `$proxy_add_x_forwarded_for` un cliente podría falsearla.
- `proxy_buffering off` y timeouts largos, porque los PDFs se transmiten desde Drive.
- Las cabeceras de seguridad (CSP, HSTS, etc.) las pone la app; no hace falta repetirlas en Nginx.

`DOMAIN` sigue siendo obligatorio en `.env.production` (Compose lo valida), aunque Caddy no arranque.

## Tareas del worker

- Extracción de texto: continua (cada 5 segundos busca archivos pendientes).
- Detección de cambios en Drive: una vez por día desde `SYNC_HOUR` (3 AM, hora de Argentina). A mano: `docker compose -f docker-compose.prod.yml --env-file .env.production run --rm worker npx tsx --conditions=react-server src/worker/sync-cli.ts`.
