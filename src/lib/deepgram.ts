// Integración con Deepgram para transcripción de audio en tiempo real.
//
// El cliente (navegador) no debe usar la API key permanente directamente:
// en su lugar, este módulo genera una API key temporal de muy corta duración
// (usage:write, TTL corto) que el navegador usa solo para abrir el WebSocket
// de streaming (wss://api.deepgram.com/v1/listen). Así el key permanente
// nunca sale del servidor.
//
// Referencia: https://developers.deepgram.com/docs/create-additional-api-keys
// y https://developers.deepgram.com/docs/live-streaming-audio

const DEEPGRAM_API_BASE = "https://api.deepgram.com/v1";

export function isDeepgramConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

let cachedProjectId: string | null = null;

async function getProjectId(apiKey: string): Promise<string> {
  if (process.env.DEEPGRAM_PROJECT_ID) return process.env.DEEPGRAM_PROJECT_ID;
  if (cachedProjectId) return cachedProjectId;

  const res = await fetch(`${DEEPGRAM_API_BASE}/projects`, {
    headers: { Authorization: `Token ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`No se pudo obtener el proyecto de Deepgram (${res.status})`);
  }
  const data = (await res.json()) as { projects: { project_id: string }[] };
  const projectId = data.projects?.[0]?.project_id;
  if (!projectId) throw new Error("La cuenta de Deepgram no tiene proyectos.");
  cachedProjectId = projectId;
  return projectId;
}

export interface TemporaryKey {
  key: string;
  expiresInSeconds: number;
}

export async function createTemporaryKey(): Promise<TemporaryKey> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Deepgram no está configurado. Define DEEPGRAM_API_KEY en las variables de entorno."
    );
  }

  const projectId = await getProjectId(apiKey);
  const ttlSeconds = 60;

  const res = await fetch(`${DEEPGRAM_API_BASE}/projects/${projectId}/keys`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: "Token temporal para transcripción en vivo desde el navegador",
      scopes: ["usage:write"],
      time_to_live_in_seconds: ttlSeconds,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`No se pudo crear el token temporal de Deepgram (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { key: string };
  return { key: data.key, expiresInSeconds: ttlSeconds };
}
