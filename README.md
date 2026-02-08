# Charlie Bot - WhatsApp Calendar Scheduler

Bot de WhatsApp para agendar citas automáticamente en Google Calendar con envío de confirmación por correo electrónico.

## 🚀 Características

- ✅ **Agendar citas vía WhatsApp** - Conversación guiada paso a paso
- 📅 **Integración con Google Calendar** - Los eventos se crean automáticamente
- 📧 **Confirmación por correo** - Envío de email con detalles de la cita
- 📱 **Captura de datos** - Nombre, email y teléfono del cliente
- 🔔 **Verificación de disponibilidad** - Evita sobreagendamientos

## 📋 Requisitos

- **Node.js** v18 o superior
- **npm** o **yarn**
- **Cuenta de Google** con:
  - Google Calendar API activada
  - Credenciales OAuth 2.0 configuradas
  - Gmail habilitado
  - Autenticación de dos factores activada (para contraseña de aplicación)
- **Teléfono con WhatsApp** para vincular al bot

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/pare1610/charlie-bot-back.git
cd charlie-bot-back
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Luego, edita `.env` con tus valores reales:

```env
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALENDAR_ID=tu_email@gmail.com
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicación
PORT=3000
```

## 🔐 Configuración de Google

### Obtener credenciales OAuth 2.0

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Activa **Google Calendar API**:
   - Ve a **APIs & Services** > **Library**
   - Busca "Google Calendar API"
   - Haz clic en **Enable**
4. Crea credenciales OAuth 2.0:
   - Ve a **APIs & Services** > **Credentials**
   - Haz clic en **+ Create Credentials** > **OAuth client ID**
   - Selecciona **Desktop application**
   - Descarga el JSON
   - Copia valores en `.env`

### Configurar contraseña de aplicación Gmail

1. Asegúrate de tener **autenticación de dos factores** activa:
   - Ve a [myaccount.google.com/security](https://myaccount.google.com/security)
   - Habilita "Verificación en dos pasos"

2. Obtén contraseña de aplicación:
   - Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Selecciona "Mail" y "Windows Computer"
   - Google generará una contraseña de 16 caracteres
   - Cópiala en `.env` como `EMAIL_PASSWORD`

### Configurar servicio de Google (opcional)

Si deseas que los eventos se creen en tu calendario automáticamente sin OAuth:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea una **Service Account**:
   - **Credentials** > **+ Create Credentials** > **Service Account**
   - Descarga el JSON
   - Guárdalo en `auth_info/service-account.json`
3. **Comparte tu calendario con el email de la service account**:
   - Abre Google Calendar
   - Configuración > Comparte este calendario
   - Añade el email de la service account con permisos de "Hacer cambios en los eventos"

## ▶️ Ejecutar el bot

### Modo desarrollo

```bash
npm run start:dev
```

### Modo producción

```bash
npm run build
npm run start:prod
```

## 💬 Flujo de uso

1. Usuario escribe **"Hola"** en WhatsApp
2. Bot muestra menú:
   - `1` - Ver pedidos
   - `2` - Agendar Cita ← Para esto
   - `3` - Contacto
3. Usuario escribe **`2`**
4. Bot pregunta: "¿Para cuándo quieres la cita?"
   - Usuario responde: `Mañana a las 10am` o `El lunes a las 3pm`
5. Bot verifica disponibilidad y pregunta nombre
6. Bot pregunta correo electrónico
7. ✅ **Cita agendada** - Evento creado en Google Calendar + Email enviado

## 📝 Estructura del proyecto

```
src/
├── auth/                 # Autenticación OAuth con Google
├── calendar/            # Servicio de Google Calendar
├── email/               # Servicio de envío de correos
├── whatsapp/            # Bot de WhatsApp (Baileys)
├── app.module.ts        # Módulo principal
├── app.controller.ts    # Controlador principal
└── main.ts             # Punto de entrada
```

## 🛠️ Scripts disponibles

```bash
npm run start        # Ejecutar en producción
npm run start:dev    # Ejecutar en modo desarrollo (con watch)
npm run build        # Compilar TypeScript
npm run lint         # Ejecutar ESLint
npm run format       # Formatear código con Prettier
npm run test         # Ejecutar tests
```

## 🔑 Variables de entorno

| Variable | Descripción | Obtener en |
|----------|-------------|-----------|
| `GOOGLE_CLIENT_ID` | ID de cliente OAuth 2.0 | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CLIENT_SECRET` | Secreto del cliente OAuth 2.0 | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_REDIRECT_URL` | URL de redirección OAuth | Configuración local (default: http://localhost:3000/auth/callback) |
| `GOOGLE_CALENDAR_ID` | Tu email de Google (donde se crean eventos) | Tu cuenta de Google |
| `EMAIL_USER` | Email para enviar confirmaciones | Tu email de Gmail |
| `EMAIL_PASSWORD` | Contraseña de aplicación Gmail | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |
| `PORT` | Puerto del servidor | Configurable (default: 3000) |

## 🌐 Endpoints

| Método | Ruta | Descripción |
|--------|------|------------|
| `GET` | `/` | Endpoint raíz (Hello World) |
| `GET` | `/auth/login` | Inicia autenticación OAuth con Google |
| `GET` | `/auth/callback` | Callback de Google (usado internamente) |
| `GET` | `/auth/status` | Verifica si está autenticado |

## 📦 Dependencias principales

- **NestJS** - Framework backend
- **Baileys** - WhatsApp Web Client
- **googleapis** - Google API client
- **nodemailer** - Envío de correos
- **chrono-node** - Parser de fechas naturales

## 🐛 Solución de problemas

### "Usuario no autenticado"
- Asegúrate de haber ejecutado el bot y visitado `http://localhost:3000/auth/login`
- Completa el flujo de autenticación con Google

### "El bot no puede crear eventos"
- Verifica que Google Calendar API esté habilitada
- Comprueba que las credenciales sean válidas

### "El correo no se envía"
- Verifica que hayas usado una **contraseña de aplicación**, no tu contraseña normal
- Asegúrate de tener autenticación de dos factores
- Verifica que `EMAIL_USER` sea correcto

### "No puedo conectar WhatsApp"
- El código QR se muestra en la consola al iniciar
- Si expiró, reinicia el bot
- Los datos se guardan en `auth_info/`

## 📄 Licencia

Este proyecto está bajo licencia UNLICENSED.

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

## 📧 Soporte

Para reportar bugs o sugerencias, abre un issue en el repositorio.

