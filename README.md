# Asistente de Requerimientos

Aplicación web para apoyar entrevistas de levantamiento de requerimientos con
clientes: graba la sesión, transcribe en tiempo real, permite capturar
requerimientos funcionales y no funcionales al vuelo, sugiere preguntas de
seguimiento y guarda fotos/documentos — todo agrupado por proyecto.

## Funcionalidades

- **Proyectos y sesiones**: cada cliente/proyecto agrupa varias sesiones (entrevistas).
- **Grabación en vivo**: graba el audio de la entrevista desde el navegador.
- **Transcripción en tiempo real** (opcional, vía Deepgram): el texto aparece
  mientras se habla y se puede editar manualmente.
- **Captura rápida de requerimientos**: formulario para anotar requerimientos
  funcionales/no funcionales con prioridad y la frase textual del cliente,
  sin salir de la entrevista.
- **Preguntas sugeridas**: un motor de reglas por palabras clave analiza la
  transcripción y sugiere preguntas de seguimiento (ver "IA" abajo).
- **Fotos y documentos**: adjunta archivos a cada sesión (bocetos, capturas,
  documentos existentes del cliente, la grabación de audio). Los archivos se
  guardan en Google Drive (no en la nube de Airtable), organizados en
  carpetas por proyecto y por sesión.

## Estado de la integración de IA

El panel "Preguntas sugeridas" hoy usa un motor de reglas por palabras clave
(`src/lib/suggestions.ts`), **no un modelo de lenguaje**. Se eligió así porque
la app se construyó sin una API key de LLM configurada. La función
`generateSuggestions(transcript, categoriasYaCubiertas)` tiene la firma que
necesitaría una integración real (Anthropic/OpenAI): para conectar un LLM,
basta con reemplazar su implementación interna — el endpoint
`POST /api/sessions/[sessionId]/suggestions` no necesita cambios.

## Stack técnico

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS**
- **Airtable** como base de datos de texto/metadatos (vía su API REST), para
  que además puedas ver/editar los datos directamente en Airtable si quieres.
- **Google Drive** para los archivos binarios (fotos, documentos, audio):
  Airtable solo guarda el nombre y el enlace de Drive, así se evita el
  límite de ~5MB del endpoint de adjuntos de Airtable.
- **Deepgram** para transcripción de audio en tiempo real (streaming vía
  WebSocket desde el navegador, usando un token temporal generado por el
  backend para no exponer la API key permanente).

## Configuración

### 1. Crear la base de Airtable

Hay dos formas de crear las tablas. La recomendada es correr el script de
migración; la manual queda documentada por si prefieres crearlas a mano o
necesitas ajustar algo.

#### Opción A (recomendada): script de migración

1. Crea una base vacía en Airtable ("Create a base" → "Start from scratch")
   y copia su ID de la URL (empieza con `app...`).
2. Genera un Personal Access Token en https://airtable.com/create/tokens con
   los scopes `schema.bases:write`, `schema.bases:read`, `data.records:read`
   y `data.records:write`, y agrega esa base en la sección "Access" del token.
3. Copia `.env.example` a `.env.local` y completa `AIRTABLE_API_KEY` y
   `AIRTABLE_BASE_ID`.
4. Corre:

   ```bash
   npm install
   npm run setup:airtable
   ```

   El script (`scripts/setup-airtable.mjs`) crea las 5 tablas con los campos
   y tipos exactos que la app espera, usando la API de metadatos de
   Airtable. Es seguro volver a correrlo: las tablas que ya existan (por
   nombre) se dejan intactas, solo crea las que falten.

   Alternativa: si defines `AIRTABLE_WORKSPACE_ID` en vez de
   `AIRTABLE_BASE_ID` (lo ves en la URL cuando estás dentro de un workspace
   en Airtable, empieza con `wsp...`), el script crea la base nueva por ti y
   te dice qué `AIRTABLE_BASE_ID` guardar. Airtable crea una tabla "Table 1"
   por defecto junto con las demás; puedes borrarla manualmente, no la usa la app.

#### Opción B: crear las tablas a mano

Crea una base en Airtable con estas tablas y campos exactos (nombres y tipos):

**Projects**
| Campo | Tipo |
|---|---|
| Name | Texto de una línea |
| Client | Texto de una línea |
| Description | Texto largo |
| DriveFolderId | Texto de una línea (la app la llena sola) |
| CreatedAt | Texto de una línea (se guarda como ISO string) |

**Sessions**
| Campo | Tipo |
|---|---|
| Title | Texto de una línea |
| Project | Vínculo a otro registro → Projects |
| Date | Fecha |
| Status | Selección única: `programada`, `en_curso`, `finalizada` |
| Notes | Texto largo |
| Transcript | Texto largo |
| DriveFolderId | Texto de una línea (la app la llena sola) |
| CreatedAt | Texto de una línea |

**Requirements**
| Campo | Tipo |
|---|---|
| Description | Texto largo |
| Type | Selección única: `funcional`, `no_funcional` |
| Priority | Selección única: `alta`, `media`, `baja` |
| Status | Selección única: `borrador`, `confirmado`, `descartado` |
| SourceQuote | Texto largo |
| Session | Vínculo a otro registro → Sessions |
| Project | Vínculo a otro registro → Projects |
| CreatedAt | Texto de una línea |

**Attachments**
| Campo | Tipo |
|---|---|
| Filename | Texto de una línea |
| Kind | Selección única: `foto`, `documento`, `audio` |
| DriveFileId | Texto de una línea |
| Url | URL |
| Session | Vínculo a otro registro → Sessions |
| CreatedAt | Texto de una línea |

**SuggestedQuestions**
| Campo | Tipo |
|---|---|
| Question | Texto largo |
| Category | Texto de una línea |
| Reason | Texto largo |
| Status | Selección única: `pendiente`, `preguntada`, `descartada` |
| Session | Vínculo a otro registro → Sessions |
| CreatedAt | Texto de una línea |

Luego consigue:
- **AIRTABLE_API_KEY**: crea un "Personal access token" en
  https://airtable.com/create/tokens con permisos `data.records:read`,
  `data.records:write` y `data.recordComments:read` sobre esa base.
- **AIRTABLE_BASE_ID**: lo ves en la URL de la base (empieza con `app...`) o
  en https://airtable.com/api tras seleccionar la base.

### 2. Configurar Google Drive (para fotos, documentos y audio)

Los archivos no se guardan en Airtable ni en ningún otro servicio en la nube
que tú no controles: se suben a tu propio Google Drive, en una carpeta que
tú creas, organizados en subcarpetas por proyecto y por sesión.

1. Crea un proyecto en https://console.cloud.google.com (o usa uno existente)
   y habilita la **Google Drive API** (menú "APIs & Services" → "Enable APIs
   and services" → busca "Google Drive API" → Enable).
2. Configura la pantalla de consentimiento OAuth ("OAuth consent screen"):
   tipo **External**, modo de publicación **Testing** está bien para uso
   personal, y agrégate a ti mismo en "Test users".
3. Crea credenciales OAuth ("Credentials" → "Create credentials" → "OAuth
   client ID") de tipo **Desktop app**. Copia el **Client ID** y **Client
   Secret** a tu `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
4. Crea manualmente una carpeta en tu Google Drive (ej. "Asistente de
   Requerimientos") y copia su ID de la URL:
   `drive.google.com/drive/folders/<ESTE ES EL ID>` → ponlo en
   `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
5. Corre `npm run setup:google-drive`: abre una URL de Google en tu
   navegador, inicias sesión y autorizas el acceso (solo a archivos que esta
   app cree, no a todo tu Drive), y el script te imprime el
   `GOOGLE_REFRESH_TOKEN` para que lo agregues a `.env.local`.

Sin estas variables, la app sigue funcionando pero la subida de adjuntos
falla y solo queda la opción de descargar el archivo localmente.

### 3. (Opcional) Cuenta de Deepgram para transcripción en vivo

1. Crea una cuenta en https://console.deepgram.com (tiene crédito gratuito).
2. Genera una API key con permisos de administrador del proyecto (necesaria
   para crear tokens temporales) y ponla en `DEEPGRAM_API_KEY`.
3. Sin esta variable, la app sigue funcionando: graba el audio normalmente,
   solo no muestra transcripción en vivo (se puede escribir manualmente).

### 4. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

### 5. Instalar y correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Limitaciones conocidas

- Si Google Drive no está configurado, o la subida falla por cualquier
  motivo (sin internet, token vencido, etc.), la app ofrece descargar el
  archivo localmente en vez de perder la grabación.
- La transcripción en vivo depende del navegador (probado en Chrome/Edge) y
  de tener buena conexión a internet.
- Las "preguntas sugeridas" son heurísticas (reglas por palabras clave), no
  generadas por un LLM — ver la sección "Estado de la integración de IA".
