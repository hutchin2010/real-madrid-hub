# Hala Madrid — Centro del Madridista

Página que se actualiza **sola** cada vez que la abres: jala marcadores y videos en vivo,
sin que tengas que pedirme nada.

## Qué necesitas (todo gratis)

### 1. API-Football (marcadores y calendario)
1. Ve a https://dashboard.api-football.com/register
2. Crea tu cuenta gratis (plan Free: 100 peticiones/día, más que suficiente para uso personal).
3. En tu dashboard, copia tu **API Key**.

### 2. YouTube Data API (últimos videos de los canales)
1. Ve a https://console.cloud.google.com/
2. Crea un proyecto nuevo (cualquier nombre, ej. "real-madrid-hub").
3. Ve a "APIs y servicios" → "Biblioteca" → busca **YouTube Data API v3** → actívala.
4. Ve a "Credenciales" → "Crear credenciales" → "Clave de API".
5. Copia esa clave.

### 3. Cuenta de Vercel (donde vive la página)
1. Ve a https://vercel.com/signup y crea tu cuenta (puedes usar tu cuenta de GitHub o Google).

## Cómo desplegarlo

1. Sube esta carpeta a un repositorio nuevo en GitHub (arrastra los archivos en github.com/new,
   o si usas GitHub Desktop, arrastra la carpeta ahí).
2. En Vercel, click en "Add New" → "Project" → selecciona ese repositorio.
3. Antes de darle "Deploy", ve a "Environment Variables" y agrega:
   - `API_FOOTBALL_KEY` → pega tu clave de API-Football
   - `YOUTUBE_API_KEY` → pega tu clave de YouTube
4. Dale click a "Deploy". En 1-2 minutos tendrás tu link (algo como `real-madrid-hub.vercel.app`).
5. Guárdalo como acceso directo en tu celular o como página de inicio en el navegador —
   listo, ese es tu centro del madridista.

## Si algo no carga

La página nunca se "rompe": si una API falla o falta una clave, te muestra un mensaje
explicando qué falta en vez de una pantalla en blanco. Revisa que copiaste bien la clave
en Vercel (Settings → Environment Variables) y vuelve a desplegar.

## Personalizarla más adelante

Tráeme este proyecto en cualquier momento y te ayudo a:
- Agregar más canales de YouTube
- Meter noticias (necesitaría otra API o fuente RSS)
- Ajustar diseño, colores o textos
