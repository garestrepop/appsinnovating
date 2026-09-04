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
  documentos existentes del cliente).

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
- **Airtable** como base de datos (vía su API REST), para que además puedas
  ver/editar los datos directamente en Airtable si quieres.
- **Deepgram** para transcripción de audio en tiempo real (streaming vía
  WebSocket desde el navegador, usando un token temporal generado por el
  backend para no exponer la API key permanente).

## Configuración

### 1. Crear la base de Airtable

Crea una base en Airtable con estas tablas y campos exactos (nombres y tipos):

**Projects**
| Campo | Tipo |
|---|---|
| Name | Texto de una línea |
| Client | Texto de una línea |
| Description | Texto largo |
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
| File | Adjunto |
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

### 2. (Opcional) Cuenta de Deepgram para transcripción en vivo

1. Crea una cuenta en https://console.deepgram.com (tiene crédito gratuito).
2. Genera una API key con permisos de administrador del proyecto (necesaria
   para crear tokens temporales) y ponla en `DEEPGRAM_API_KEY`.
3. Sin esta variable, la app sigue funcionando: graba el audio normalmente,
   solo no muestra transcripción en vivo (se puede escribir manualmente).

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

### 4. Instalar y correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Limitaciones conocidas

- El endpoint de subida de adjuntos de Airtable acepta archivos de hasta
  ~5MB. Si una grabación de audio supera ese tamaño, la app no podrá subirla
  automáticamente y en su lugar ofrece un enlace para descargarla localmente.
- La transcripción en vivo depende del navegador (probado en Chrome/Edge) y
  de tener buena conexión a internet.
- Las "preguntas sugeridas" son heurísticas (reglas por palabras clave), no
  generadas por un LLM — ver la sección "Estado de la integración de IA".
