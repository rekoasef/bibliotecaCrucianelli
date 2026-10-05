# 08 · Configurar Google Drive y el mail

Guía para conectar la app al Drive real de la empresa (cuenta de servicio) y al mail (SMTP). Sirve igual para local (`.env`) y para la VPS (`.env.production`).

## 1. Google Drive: cuenta de servicio

La app lee Drive con una **cuenta de servicio**: un usuario "robot" de Google que solo ve las carpetas que se compartan con él, en modo lectura.

### 1.1 Proyecto y Drive API

1. Entrar a <https://console.cloud.google.com/> con una cuenta de la empresa.
2. Arriba a la izquierda, selector de proyectos → **Proyecto nuevo**. Nombre sugerido: `biblioteca-tecnica`. Crear y seleccionarlo.
3. Menú → **APIs y servicios → Biblioteca** → buscar **Google Drive API** → **Habilitar**.

### 1.2 Crear la cuenta de servicio

1. Menú → **IAM y administración → Cuentas de servicio** → **Crear cuenta de servicio**.
2. Nombre: `biblioteca-drive`. **Crear y continuar**.
3. Roles del proyecto: **ninguno** (no hace falta; el acceso se da compartiendo carpetas). **Listo**.
4. Copiar el email de la cuenta, algo como `biblioteca-drive@biblioteca-tecnica.iam.gserviceaccount.com`.

### 1.3 Clave JSON

1. Entrar a la cuenta de servicio → pestaña **Claves** → **Agregar clave → Crear clave nueva → JSON**.
2. Se descarga un archivo `.json`. **Es una contraseña**: no subirlo al repo, no mandarlo por chat; guardarlo en un lugar seguro.

> Si aparece el error *"La creación de claves de cuentas de servicio está inhabilitada"*, la organización tiene activa la política `iam.disableServiceAccountKeyCreation`. Un administrador de Google Cloud de la empresa tiene que permitirla para este proyecto (IAM → Políticas de la organización).

### 1.4 Compartir las carpetas

Para cada carpeta raíz de documentación:

- **Carpeta en "Mi unidad":** clic derecho → **Compartir** → pegar el email de la cuenta de servicio → rol **Lector** → desmarcar "Notificar" → **Compartir**.
- **Unidad compartida:** abrir la unidad → **Administrar miembros** → agregar el email de la cuenta de servicio como **Lector**.

> Google Workspace puede bloquear compartir con direcciones fuera de la organización (la cuenta de servicio termina en `gserviceaccount.com`). Si Drive no deja compartir, un administrador de Workspace tiene que permitirlo (Admin → Apps → Google Workspace → Drive y Documentos → Configuración de uso compartido), al menos para esa unidad.

Para empezar alcanza con **una o dos carpetas de prueba** con documentación real (algunos PDFs con texto, uno escaneado y un video).

### 1.5 IDs de las carpetas

El ID está en la URL al abrir la carpeta: `https://drive.google.com/drive/folders/`**`1AbCdEfGh...`**. Para una unidad compartida, es el ID de la URL de la unidad.

### 1.6 Variables de entorno

Del JSON descargado se usan `client_email` y `private_key`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=biblioteca-drive@biblioteca-tecnica.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
DRIVE_ROOT_FOLDER_IDS=1AbCdEfGh...,1XyZ...
```

- La clave va **entre comillas dobles y en una sola línea**, con los `\n` tal como aparecen en el JSON.
- Con estas variables completas, la app usa el Drive real (ignora `DRIVE_LOCAL_DIR`).
- Reiniciar `npm run dev` después de cambiar `.env` (y `npm run worker:up` para el worker).

### 1.7 Verificar

1. Entrar como admin → **Admin → Drive**: tienen que aparecer las carpetas compartidas.
2. Incorporar un PDF, clasificarlo y publicarlo; en la ficha, **Ver** tiene que abrir el PDF.
3. Con el worker levantado (`npm run worker:up`), el estado de texto del archivo pasa de "pendiente" a "ok".

Si no aparece ninguna carpeta: revisar que estén compartidas con el email exacto de la cuenta de servicio y que los IDs de `DRIVE_ROOT_FOLDER_IDS` sean de esas carpetas.

## 2. Mail (SMTP) con contraseña de aplicación

Con una cuenta de Google Workspace de la empresa (por ejemplo `biblioteca@crucianelli.com`):

1. La cuenta tiene que tener la **verificación en 2 pasos** activada (<https://myaccount.google.com/security>).
2. Crear la contraseña de aplicación en <https://myaccount.google.com/apppasswords> (nombre: `Biblioteca técnica`). Google muestra 16 letras: copiarlas sin espacios. Si la opción no aparece, un administrador de Workspace la tiene deshabilitada para la organización.
3. Variables de entorno:

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

**Verificar:** como admin, crear un usuario con un email propio y comprobar que llegue la invitación (revisar spam la primera vez) y que el link funcione.
