# 08 · Cargar archivos de Drive y configurar el mail

## 1. Archivos de Drive (links públicos)

Decisión (ver `docs/02`, "Google Drive"): no se usa Google Cloud. Los archivos se incorporan pegando su link. No hay nada que configurar en el servidor.

### Compartir un archivo

1. En Drive, clic derecho sobre el archivo → **Compartir**.
2. En **Acceso general**, elegir **Cualquier persona con el vínculo**, rol **Lector**.
3. **Copiar vínculo**.

También se puede compartir una carpeta entera con "Cualquier persona con el vínculo": sus archivos heredan el acceso, pero igual hay que pegar el link de **cada archivo** (sin Google Cloud no se pueden recorrer carpetas).

### Incorporar

**Admin → Drive → pegar los links** (uno por línea) → **Incorporar links**. Se crean borradores con el nombre del archivo como título; después se clasifican y publican.

- Los PDFs, planos e imágenes los sirve la app con sus permisos: los usuarios nunca ven el link de Drive.
- Los videos se embeben con el reproductor de Drive (y el botón "Abrir en Drive").
- **Google Docs, Sheets y Slides no se aceptan:** exportarlos a PDF (Archivo → Descargar → PDF), subir el PDF a Drive y pegar ese link.
- Si un link da error "No se pudo abrir", el archivo no está compartido con "Cualquier persona con el vínculo" o fue borrado.

### Cambios en Drive

Cada noche el worker revisa los archivos: si cambió el tamaño o la fecha, el documento queda "requiere revisión" y se vuelve a extraer el texto; si dejó de ser público o se borró, queda "no disponible" (aviso en el panel del admin).

Si se reemplaza un archivo en Drive por otro distinto (archivo nuevo, link nuevo), conviene usar **Nueva versión** en la ficha del documento y pegar el link nuevo.

### Alternativas (no usadas)

El código también soporta una cuenta de servicio de Google Cloud (`GOOGLE_SERVICE_ACCOUNT_*`, con explorador de carpetas y archivos privados) y una carpeta local (`DRIVE_LOCAL_DIR`, solo desarrollo).

## 2. Mail (SMTP) con contraseña de aplicación

Con una cuenta de Google Workspace de la empresa (por ejemplo `biblioteca@crucianelli.com`):

1. La cuenta tiene que tener la **verificación en 2 pasos** activada (<https://myaccount.google.com/security>).
2. Crear la contraseña de aplicación en <https://myaccount.google.com/apppasswords> (nombre: `Biblioteca técnica`). Google muestra 16 letras: copiarlas sin espacios. Si la opción no aparece, un administrador de Workspace la tiene deshabilitada para la organización.
3. Variables de entorno (`.env` en local, `.env.production` en la VPS):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=biblioteca@crucianelli.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM="Biblioteca Técnica Crucianelli <biblioteca@crucianelli.com>"
```

- `SMTP_FROM` tiene que ser la misma cuenta (o un alias configurado en ella); si no, Gmail lo reemplaza.
- Con `SMTP_HOST` completo los mails se envían de verdad (ya no salen por la consola).
- Límite de Google Workspace: unos 2.000 mails por día, de sobra para invitaciones y recuperaciones.
- Reiniciar `npm run dev` después de cambiar `.env`.

**Verificar:** como admin, crear un usuario con un email propio y comprobar que llegue la invitación (revisar spam la primera vez) y que el link funcione.
