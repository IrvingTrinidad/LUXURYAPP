# Love Match AI - Render + MongoDB Atlas

Proyecto web tipo app de citas, hecho con Node.js, Express, HTML/EJS, CSS, MongoDB Atlas, Gemini API y botón de Google Maps.

## 1. Configurar variables

Copia `.env.example` y renómbralo a `.env` si lo corres localmente.

```env
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net/love_match?retryWrites=true&w=majority
GEMINI_API_KEY=TU_API_KEY_DE_GEMINI
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_MAPS_API_KEY=TU_API_KEY_DE_GOOGLE_MAPS
SESSION_SECRET=clave_segura
PORT=3000
```

En Render, esas mismas variables se pegan en **Environment Variables**. El modelo recomendado para este proyecto es `gemini-2.5-flash`, porque es rápido para rompehielos, chat simulado y recomendaciones de citas.

## 2. Correr local

```bash
npm install
npm start
```

Abre:

```txt
http://localhost:3000
```

## 3. Subir a Render

1. Sube esta carpeta a GitHub.
2. En Render crea un **Web Service**.
3. Conecta tu repositorio.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Agrega las variables de entorno.
7. Deploy.

## Incluye

- Login y registro.
- 90 perfiles generados, hombres y mujeres.
- Matches simulados.
- Rompehielos generados con Gemini.
- Chat simulado con Gemini.
- Botón para buscar lugares de cita en Google Maps.
- Diseño oscuro parecido a las imágenes de referencia.


## Archivos importantes para editar

- `.env.example`: aquí están los espacios para pegar `MONGODB_URI`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GOOGLE_MAPS_API_KEY` y `SESSION_SECRET`.
- `server.js`: ya lee las variables con `process.env`. No pegues tus claves directamente en el código.
- `data/profiles.json`: aquí están los 90 perfiles generados, 45 hombres y 45 mujeres.

## Nota importante

No subas tu archivo `.env` real a GitHub. En Render pega las claves en **Environment Variables**.
