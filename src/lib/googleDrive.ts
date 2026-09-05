// Cliente de Google Drive (API v3) para guardar los adjuntos de las
// sesiones (fotos, documentos, audio). Airtable solo guarda la referencia
// (DriveFileId + Url), no el archivo en sí — así evitamos el límite de ~5MB
// del endpoint de adjuntos de Airtable.
//
// Usa OAuth 2.0 con un refresh token de la cuenta personal de Google del
// usuario (no un service account, que no tiene cuota propia de Drive).
// Ver README y scripts/get-google-refresh-token.mjs para obtenerlo.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  );
}

class GoogleDriveNotConfiguredError extends Error {
  constructor() {
    super(
      "Google Drive no está configurado. Define GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, " +
        "GOOGLE_REFRESH_TOKEN y GOOGLE_DRIVE_ROOT_FOLDER_ID en las variables de entorno."
    );
    this.name = "GoogleDriveNotConfiguredError";
  }
}

function requireConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!clientId || !clientSecret || !refreshToken || !rootFolderId) {
    throw new GoogleDriveNotConfiguredError();
  }
  return { clientId, clientSecret, refreshToken, rootFolderId };
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = requireConfig();

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`No se pudo renovar el token de Google Drive (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function getDriveRootFolderId(): string {
  return requireConfig().rootFolderId;
}

/**
 * Busca una subcarpeta por nombre dentro de `parentId`; si no existe, la crea.
 */
export async function ensureFolder(parentId: string, name: string): Promise<string> {
  const accessToken = await getAccessToken();

  const query = new URLSearchParams({
    q: `'${parentId}' in parents and name = '${escapeDriveQueryValue(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    spaces: "drive",
  });
  const searchRes = await fetch(`${DRIVE_API}/files?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!searchRes.ok) {
    throw new Error(`Error buscando carpeta en Drive (${searchRes.status}): ${await searchRes.text()}`);
  }
  const searchData = (await searchRes.json()) as { files: { id: string }[] };
  if (searchData.files.length > 0) return searchData.files[0].id;

  const createRes = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Error creando carpeta en Drive (${createRes.status}): ${await createRes.text()}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export interface UploadedDriveFile {
  id: string;
  url: string;
}

/**
 * Sube un archivo a una carpeta de Drive usando upload resumible (soporta
 * archivos grandes, como grabaciones de audio largas, sin el límite de 5MB
 * que tiene el endpoint de adjuntos de Airtable).
 */
export async function uploadFileToDrive(input: {
  parentId: string;
  filename: string;
  mimeType: string;
  content: Buffer;
}): Promise<UploadedDriveFile> {
  const accessToken = await getAccessToken();

  const initRes = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=id,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType || "application/octet-stream",
        "X-Upload-Content-Length": String(input.content.byteLength),
      },
      body: JSON.stringify({ name: input.filename, parents: [input.parentId] }),
    }
  );
  if (!initRes.ok) {
    throw new Error(
      `No se pudo iniciar la subida a Drive (${initRes.status}): ${await initRes.text()}`
    );
  }
  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("Drive no devolvió una URL de subida (Location header).");

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": input.mimeType || "application/octet-stream",
      "Content-Length": String(input.content.byteLength),
    },
    body: new Uint8Array(input.content),
  });
  if (!putRes.ok) {
    throw new Error(`Falló la subida a Drive (${putRes.status}): ${await putRes.text()}`);
  }
  const uploaded = (await putRes.json()) as { id: string; webViewLink: string };
  return { id: uploaded.id, url: uploaded.webViewLink };
}
