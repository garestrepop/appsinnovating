#!/usr/bin/env node
// Script de migración: crea (o completa) en Airtable las tablas que espera
// esta app, usando la API de metadatos de Airtable.
//
// Es idempotente: si vuelves a correrlo, las tablas que ya existen (por
// nombre) se dejan intactas y solo se crean las que falten.
//
// USO
// ----
// 1) Crea manualmente una base vacía en Airtable (Create a base > Start
//    from scratch) y copia su ID de la URL (empieza con "app...").
//    - Alternativa: si prefieres que este script también cree la base,
//      define AIRTABLE_WORKSPACE_ID en vez de AIRTABLE_BASE_ID (ver README).
// 2) Genera un Personal Access Token en https://airtable.com/create/tokens
//    con los scopes: schema.bases:write, schema.bases:read,
//    data.records:read, data.records:write — y agrega la base (o el
//    workspace) en la sección "Access".
// 3) Pon AIRTABLE_API_KEY y AIRTABLE_BASE_ID (o AIRTABLE_WORKSPACE_ID) en
//    .env.local.
// 4) Corre: npm run setup:airtable
//
// Nota: los nombres de tabla/campo aquí deben coincidir exactamente con
// src/lib/airtable-tables.ts. Si cambias uno, cambia el otro.

import { readFileSync, existsSync } from "node:fs";

const API_BASE = "https://api.airtable.com/v0";

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

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const WORKSPACE_ID = process.env.AIRTABLE_WORKSPACE_ID;

if (!API_KEY) {
  console.error(
    "Falta AIRTABLE_API_KEY. Defínelo en .env.local (ver README, sección Airtable)."
  );
  process.exit(1);
}
if (!BASE_ID && !WORKSPACE_ID) {
  console.error(
    "Define AIRTABLE_BASE_ID (base ya creada, empieza con 'app...') o " +
      "AIRTABLE_WORKSPACE_ID (para que este script cree la base, empieza con 'wsp...') en .env.local."
  );
  process.exit(1);
}

async function request(path, init) {
  const res = await fetch(`${API_BASE}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `Airtable API error (${res.status}) en ${path}: ${JSON.stringify(json)}`
    );
  }
  return json;
}

// ---------- Definición de tablas (debe coincidir con src/lib/airtable-tables.ts) ----------

const singleSelect = (choices) => ({
  type: "singleSelect",
  options: { choices: choices.map((name) => ({ name })) },
});

function buildTableDefs({ projectsTableId, sessionsTableId }) {
  return {
    Projects: {
      name: "Projects",
      fields: [
        { name: "Name", type: "singleLineText" },
        { name: "Client", type: "singleLineText" },
        { name: "Description", type: "multilineText" },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
    Sessions: {
      name: "Sessions",
      fields: [
        { name: "Title", type: "singleLineText" },
        {
          name: "Project",
          type: "multipleRecordLinks",
          options: { linkedTableId: projectsTableId },
        },
        { name: "Date", type: "date", options: { dateFormat: { name: "iso" } } },
        { name: "Status", ...singleSelect(["programada", "en_curso", "finalizada"]) },
        { name: "Notes", type: "multilineText" },
        { name: "Transcript", type: "multilineText" },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
    Requirements: {
      name: "Requirements",
      fields: [
        { name: "Description", type: "multilineText" },
        { name: "Type", ...singleSelect(["funcional", "no_funcional"]) },
        { name: "Priority", ...singleSelect(["alta", "media", "baja"]) },
        { name: "Status", ...singleSelect(["borrador", "confirmado", "descartado"]) },
        { name: "SourceQuote", type: "multilineText" },
        {
          name: "Session",
          type: "multipleRecordLinks",
          options: { linkedTableId: sessionsTableId },
        },
        {
          name: "Project",
          type: "multipleRecordLinks",
          options: { linkedTableId: projectsTableId },
        },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
    Attachments: {
      name: "Attachments",
      fields: [
        { name: "Filename", type: "singleLineText" },
        { name: "Kind", ...singleSelect(["foto", "documento", "audio"]) },
        { name: "File", type: "multipleAttachments" },
        {
          name: "Session",
          type: "multipleRecordLinks",
          options: { linkedTableId: sessionsTableId },
        },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
    SuggestedQuestions: {
      name: "SuggestedQuestions",
      fields: [
        { name: "Question", type: "multilineText" },
        { name: "Category", type: "singleLineText" },
        { name: "Reason", type: "multilineText" },
        { name: "Status", ...singleSelect(["pendiente", "preguntada", "descartada"]) },
        {
          name: "Session",
          type: "multipleRecordLinks",
          options: { linkedTableId: sessionsTableId },
        },
        { name: "CreatedAt", type: "singleLineText" },
      ],
    },
  };
}

// Orden de creación: cada tabla solo puede referenciar (via linkedTableId)
// tablas que ya existen.
const CREATION_ORDER = [
  "Projects",
  "Sessions",
  "Requirements",
  "Attachments",
  "SuggestedQuestions",
];

async function main() {
  let baseId = BASE_ID;
  const tableIdsByName = {};

  if (!baseId) {
    console.log(`Creando base nueva en el workspace ${WORKSPACE_ID}...`);
    const defs = buildTableDefs({ projectsTableId: "", sessionsTableId: "" });
    const created = await request("meta/bases", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: WORKSPACE_ID,
        name: "Asistente de Requerimientos",
        tables: [defs.Projects],
      }),
    });
    baseId = created.id;
    tableIdsByName.Projects = created.tables[0].id;
    console.log(`Base creada: ${baseId}`);
    console.log(
      `\n>>> Agrega AIRTABLE_BASE_ID=${baseId} a tu .env.local (además de AIRTABLE_API_KEY).\n`
    );
  } else {
    console.log(`Usando base existente: ${baseId}`);
    const existing = await request(`meta/bases/${baseId}/tables`);
    for (const t of existing.tables) tableIdsByName[t.name] = t.id;
  }

  for (const tableName of CREATION_ORDER) {
    if (tableIdsByName[tableName]) {
      console.log(`- ${tableName}: ya existe, se omite.`);
      continue;
    }
    const defs = buildTableDefs({
      projectsTableId: tableIdsByName.Projects,
      sessionsTableId: tableIdsByName.Sessions,
    });
    const def = defs[tableName];
    console.log(`- ${tableName}: creando...`);
    const created = await request(`meta/bases/${baseId}/tables`, {
      method: "POST",
      body: JSON.stringify(def),
    });
    tableIdsByName[tableName] = created.id;
    console.log(`  listo (${created.id})`);
  }

  console.log("\nBase de Airtable lista.");
  if (!BASE_ID) {
    console.log(
      `Recuerda guardar AIRTABLE_BASE_ID=${baseId} en tu .env.local si aún no lo hiciste.`
    );
  }
  console.log(
    "Puedes borrar la tabla 'Table 1' que Airtable crea por defecto si la base era nueva."
  );
}

main().catch((err) => {
  console.error("\nFalló la migración:", err.message);
  process.exit(1);
});
