#!/usr/bin/env node
// Script de un solo uso: obtiene un refresh token de Google OAuth para que
// la app pueda subir archivos a Drive en nombre de tu cuenta sin volver a
// pedir login cada vez.
//
// Requisitos previos (ver README, sección "Almacenamiento de archivos"):
// 1) Crear un proyecto en https://console.cloud.google.com
// 2) Habilitar la "Google Drive API"
// 3) Configurar la pantalla de consentimiento OAuth (External, modo prueba
//    está bien, agrégate a ti mismo como "test user")
// 4) Crear credenciales OAuth de tipo "Desktop app" y copiar el Client ID
//    y Client Secret
//
// Uso:
//   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/get-google-refresh-token.mjs
// (o ponlos primero en .env.local, el script los lee de ahí también)

import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Falta GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET. Defínelos en .env.local antes de correr este script."
  );
  process.exit(1);
}

// Scope mínimo: solo archivos/carpetas creados por esta app, no todo el Drive.
const SCOPE = "https://www.googleapis.com/auth/drive.file";

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end("Autorización cancelada. Puedes cerrar esta pestaña.");
    console.error(`\nGoogle devolvió un error: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.end("Falta el parámetro 'code'.");
    return;
  }

  res.end("Listo, ya puedes cerrar esta pestaña y volver a la terminal.");
  server.close();

  const port = server.address().port;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: `http://localhost:${port}`,
      grant_type: "authorization_code",
    }),
  });

  const data = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error("\nFalló el intercambio del código por tokens:", data);
    process.exit(1);
  }
  if (!data.refresh_token) {
    console.error(
      "\nGoogle no devolvió un refresh_token. Esto pasa si ya autorizaste esta app antes: " +
        "ve a https://myaccount.google.com/permissions, quita el acceso de esta app, y vuelve a correr el script."
    );
    process.exit(1);
  }

  console.log("\n>>> Agrega esto a tu .env.local:\n");
  console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}`);
  console.log();
});

server.listen(0, () => {
  const port = server.address().port;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", `http://localhost:${port}`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("Abre esta URL en tu navegador y autoriza el acceso:\n");
  console.log(authUrl.toString());
  console.log("\nEsperando la autorización...");
});
