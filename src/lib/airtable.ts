import {
  ATTACHMENT_FIELDS,
  PROJECT_FIELDS,
  REQUIREMENT_FIELDS,
  SESSION_FIELDS,
  SUGGESTION_FIELDS,
  TABLES,
} from "./airtable-tables";
import type {
  Attachment,
  AttachmentKind,
  Project,
  Requirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
  InterviewSession,
  SessionStatus,
  SuggestedQuestion,
  SuggestionStatus,
} from "./types";

const API_BASE = "https://api.airtable.com/v0";
const CONTENT_API_BASE = "https://content.airtable.com/v0";

function getCredentials() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  return { apiKey, baseId };
}

export function isAirtableConfigured(): boolean {
  const { apiKey, baseId } = getCredentials();
  return Boolean(apiKey && baseId);
}

class AirtableNotConfiguredError extends Error {
  constructor() {
    super(
      "Airtable no está configurado. Define AIRTABLE_API_KEY y AIRTABLE_BASE_ID en las variables de entorno."
    );
    this.name = "AirtableNotConfiguredError";
  }
}

function requireCredentials() {
  const { apiKey, baseId } = getCredentials();
  if (!apiKey || !baseId) throw new AirtableNotConfiguredError();
  return { apiKey, baseId };
}

async function airtableRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { apiKey, baseId } = requireCredentials();
  const res = await fetch(`${API_BASE}/${baseId}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404) {
      throw new Error(
        `Airtable API error (404): ${body}. Verifica que AIRTABLE_BASE_ID sea correcto (empieza con "app..."), ` +
          `que las tablas existan en esa base con el nombre exacto (Projects, Sessions, Requirements, Attachments, ` +
          `SuggestedQuestions — respetando mayúsculas) y que el Personal Access Token tenga esta base agregada en ` +
          `"Access" al crearlo en airtable.com/create/tokens.`
      );
    }
    throw new Error(`Airtable API error (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

interface AirtableRecord<F> {
  id: string;
  createdTime: string;
  fields: F;
}

interface AirtableListResponse<F> {
  records: AirtableRecord<F>[];
  offset?: string;
}

async function listAll<F>(
  table: string,
  params: Record<string, string> = {}
): Promise<AirtableRecord<F>[]> {
  const records: AirtableRecord<F>[] = [];
  let offset: string | undefined;
  do {
    const query = new URLSearchParams({ ...params, pageSize: "100" });
    if (offset) query.set("offset", offset);
    const data = await airtableRequest<AirtableListResponse<F>>(
      `${encodeURIComponent(table)}?${query.toString()}`
    );
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

async function createRecord<F>(
  table: string,
  fields: F
): Promise<AirtableRecord<F>> {
  const data = await airtableRequest<AirtableRecord<F>>(
    encodeURIComponent(table),
    { method: "POST", body: JSON.stringify({ fields }) }
  );
  return data;
}

async function updateRecord<F>(
  table: string,
  recordId: string,
  fields: Partial<F>
): Promise<AirtableRecord<F>> {
  const data = await airtableRequest<AirtableRecord<F>>(
    `${encodeURIComponent(table)}/${recordId}`,
    { method: "PATCH", body: JSON.stringify({ fields }) }
  );
  return data;
}

async function getRecord<F>(
  table: string,
  recordId: string
): Promise<AirtableRecord<F>> {
  return airtableRequest<AirtableRecord<F>>(
    `${encodeURIComponent(table)}/${recordId}`
  );
}

async function deleteRecord(table: string, recordId: string): Promise<void> {
  await airtableRequest(`${encodeURIComponent(table)}/${recordId}`, {
    method: "DELETE",
  });
}

// ---------- Mappers ----------

interface ProjectFieldsShape {
  [PROJECT_FIELDS.name]?: string;
  [PROJECT_FIELDS.client]?: string;
  [PROJECT_FIELDS.description]?: string;
  [PROJECT_FIELDS.createdAt]?: string;
}

function mapProject(record: AirtableRecord<ProjectFieldsShape>): Project {
  return {
    id: record.id,
    name: record.fields[PROJECT_FIELDS.name] ?? "",
    client: record.fields[PROJECT_FIELDS.client] ?? "",
    description: record.fields[PROJECT_FIELDS.description],
    createdAt: record.fields[PROJECT_FIELDS.createdAt] ?? record.createdTime,
  };
}

interface SessionFieldsShape {
  [SESSION_FIELDS.title]?: string;
  [SESSION_FIELDS.project]?: string[];
  [SESSION_FIELDS.date]?: string;
  [SESSION_FIELDS.status]?: SessionStatus;
  [SESSION_FIELDS.notes]?: string;
  [SESSION_FIELDS.transcript]?: string;
  [SESSION_FIELDS.createdAt]?: string;
}

function mapSession(
  record: AirtableRecord<SessionFieldsShape>
): InterviewSession {
  return {
    id: record.id,
    projectId: record.fields[SESSION_FIELDS.project]?.[0] ?? "",
    title: record.fields[SESSION_FIELDS.title] ?? "",
    date: record.fields[SESSION_FIELDS.date] ?? record.createdTime,
    status: record.fields[SESSION_FIELDS.status] ?? "programada",
    notes: record.fields[SESSION_FIELDS.notes],
    transcript: record.fields[SESSION_FIELDS.transcript],
    createdAt: record.fields[SESSION_FIELDS.createdAt] ?? record.createdTime,
  };
}

interface RequirementFieldsShape {
  [REQUIREMENT_FIELDS.description]?: string;
  [REQUIREMENT_FIELDS.type]?: RequirementType;
  [REQUIREMENT_FIELDS.priority]?: RequirementPriority;
  [REQUIREMENT_FIELDS.status]?: RequirementStatus;
  [REQUIREMENT_FIELDS.sourceQuote]?: string;
  [REQUIREMENT_FIELDS.session]?: string[];
  [REQUIREMENT_FIELDS.project]?: string[];
  [REQUIREMENT_FIELDS.createdAt]?: string;
}

function mapRequirement(
  record: AirtableRecord<RequirementFieldsShape>
): Requirement {
  return {
    id: record.id,
    sessionId: record.fields[REQUIREMENT_FIELDS.session]?.[0] ?? "",
    projectId: record.fields[REQUIREMENT_FIELDS.project]?.[0] ?? "",
    description: record.fields[REQUIREMENT_FIELDS.description] ?? "",
    type: record.fields[REQUIREMENT_FIELDS.type] ?? "funcional",
    priority: record.fields[REQUIREMENT_FIELDS.priority] ?? "media",
    status: record.fields[REQUIREMENT_FIELDS.status] ?? "borrador",
    sourceQuote: record.fields[REQUIREMENT_FIELDS.sourceQuote],
    createdAt:
      record.fields[REQUIREMENT_FIELDS.createdAt] ?? record.createdTime,
  };
}

interface AttachmentFieldsShape {
  [ATTACHMENT_FIELDS.filename]?: string;
  [ATTACHMENT_FIELDS.kind]?: AttachmentKind;
  [ATTACHMENT_FIELDS.file]?: { url: string; filename: string }[];
  [ATTACHMENT_FIELDS.session]?: string[];
  [ATTACHMENT_FIELDS.createdAt]?: string;
}

function mapAttachment(
  record: AirtableRecord<AttachmentFieldsShape>
): Attachment {
  return {
    id: record.id,
    sessionId: record.fields[ATTACHMENT_FIELDS.session]?.[0] ?? "",
    kind: record.fields[ATTACHMENT_FIELDS.kind] ?? "documento",
    filename: record.fields[ATTACHMENT_FIELDS.filename] ?? "",
    url: record.fields[ATTACHMENT_FIELDS.file]?.[0]?.url ?? "",
    createdAt:
      record.fields[ATTACHMENT_FIELDS.createdAt] ?? record.createdTime,
  };
}

interface SuggestionFieldsShape {
  [SUGGESTION_FIELDS.question]?: string;
  [SUGGESTION_FIELDS.category]?: string;
  [SUGGESTION_FIELDS.reason]?: string;
  [SUGGESTION_FIELDS.status]?: SuggestionStatus;
  [SUGGESTION_FIELDS.session]?: string[];
  [SUGGESTION_FIELDS.createdAt]?: string;
}

function mapSuggestion(
  record: AirtableRecord<SuggestionFieldsShape>
): SuggestedQuestion {
  return {
    id: record.id,
    sessionId: record.fields[SUGGESTION_FIELDS.session]?.[0] ?? "",
    question: record.fields[SUGGESTION_FIELDS.question] ?? "",
    category: record.fields[SUGGESTION_FIELDS.category] ?? "",
    reason: record.fields[SUGGESTION_FIELDS.reason] ?? "",
    status: record.fields[SUGGESTION_FIELDS.status] ?? "pendiente",
    createdAt:
      record.fields[SUGGESTION_FIELDS.createdAt] ?? record.createdTime,
  };
}

// ---------- Projects ----------

export async function listProjects(): Promise<Project[]> {
  const records = await listAll<ProjectFieldsShape>(TABLES.projects);
  return records.map(mapProject).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getProject(id: string): Promise<Project> {
  const record = await getRecord<ProjectFieldsShape>(TABLES.projects, id);
  return mapProject(record);
}

export async function createProject(input: {
  name: string;
  client: string;
  description?: string;
}): Promise<Project> {
  const record = await createRecord<ProjectFieldsShape>(TABLES.projects, {
    [PROJECT_FIELDS.name]: input.name,
    [PROJECT_FIELDS.client]: input.client,
    [PROJECT_FIELDS.description]: input.description ?? "",
    [PROJECT_FIELDS.createdAt]: new Date().toISOString(),
  });
  return mapProject(record);
}

// ---------- Sessions ----------

export async function listSessions(
  projectId?: string
): Promise<InterviewSession[]> {
  const records = await listAll<SessionFieldsShape>(TABLES.sessions);
  const sessions = records.map(mapSession);
  const filtered = projectId
    ? sessions.filter((s) => s.projectId === projectId)
    : sessions;
  return filtered.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getSession(id: string): Promise<InterviewSession> {
  const record = await getRecord<SessionFieldsShape>(TABLES.sessions, id);
  return mapSession(record);
}

export async function createSession(input: {
  projectId: string;
  title: string;
  date: string;
}): Promise<InterviewSession> {
  const record = await createRecord<SessionFieldsShape>(TABLES.sessions, {
    [SESSION_FIELDS.title]: input.title,
    [SESSION_FIELDS.project]: [input.projectId],
    [SESSION_FIELDS.date]: input.date,
    [SESSION_FIELDS.status]: "programada",
    [SESSION_FIELDS.createdAt]: new Date().toISOString(),
  });
  return mapSession(record);
}

export async function updateSession(
  id: string,
  patch: Partial<{
    title: string;
    status: SessionStatus;
    notes: string;
    transcript: string;
  }>
): Promise<InterviewSession> {
  const fields: Partial<SessionFieldsShape> = {};
  if (patch.title !== undefined) fields[SESSION_FIELDS.title] = patch.title;
  if (patch.status !== undefined) fields[SESSION_FIELDS.status] = patch.status;
  if (patch.notes !== undefined) fields[SESSION_FIELDS.notes] = patch.notes;
  if (patch.transcript !== undefined)
    fields[SESSION_FIELDS.transcript] = patch.transcript;
  const record = await updateRecord<SessionFieldsShape>(
    TABLES.sessions,
    id,
    fields
  );
  return mapSession(record);
}

// ---------- Requirements ----------

export async function listRequirements(filter: {
  sessionId?: string;
  projectId?: string;
}): Promise<Requirement[]> {
  const records = await listAll<RequirementFieldsShape>(TABLES.requirements);
  let requirements = records.map(mapRequirement);
  if (filter.sessionId)
    requirements = requirements.filter((r) => r.sessionId === filter.sessionId);
  if (filter.projectId)
    requirements = requirements.filter((r) => r.projectId === filter.projectId);
  return requirements.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createRequirement(input: {
  sessionId: string;
  projectId: string;
  type: RequirementType;
  description: string;
  priority: RequirementPriority;
  sourceQuote?: string;
}): Promise<Requirement> {
  const record = await createRecord<RequirementFieldsShape>(
    TABLES.requirements,
    {
      [REQUIREMENT_FIELDS.description]: input.description,
      [REQUIREMENT_FIELDS.type]: input.type,
      [REQUIREMENT_FIELDS.priority]: input.priority,
      [REQUIREMENT_FIELDS.status]: "borrador",
      [REQUIREMENT_FIELDS.sourceQuote]: input.sourceQuote ?? "",
      [REQUIREMENT_FIELDS.session]: [input.sessionId],
      [REQUIREMENT_FIELDS.project]: [input.projectId],
      [REQUIREMENT_FIELDS.createdAt]: new Date().toISOString(),
    }
  );
  return mapRequirement(record);
}

export async function updateRequirement(
  id: string,
  patch: Partial<{
    description: string;
    type: RequirementType;
    priority: RequirementPriority;
    status: RequirementStatus;
  }>
): Promise<Requirement> {
  const fields: Partial<RequirementFieldsShape> = {};
  if (patch.description !== undefined)
    fields[REQUIREMENT_FIELDS.description] = patch.description;
  if (patch.type !== undefined) fields[REQUIREMENT_FIELDS.type] = patch.type;
  if (patch.priority !== undefined)
    fields[REQUIREMENT_FIELDS.priority] = patch.priority;
  if (patch.status !== undefined)
    fields[REQUIREMENT_FIELDS.status] = patch.status;
  const record = await updateRecord<RequirementFieldsShape>(
    TABLES.requirements,
    id,
    fields
  );
  return mapRequirement(record);
}

export async function deleteRequirement(id: string): Promise<void> {
  await deleteRecord(TABLES.requirements, id);
}

// ---------- Attachments ----------

export async function listAttachments(
  sessionId: string
): Promise<Attachment[]> {
  const records = await listAll<AttachmentFieldsShape>(TABLES.attachments);
  return records
    .map(mapAttachment)
    .filter((a) => a.sessionId === sessionId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createAttachment(input: {
  sessionId: string;
  kind: AttachmentKind;
  filename: string;
  contentType: string;
  base64Content: string;
}): Promise<Attachment> {
  const { apiKey, baseId } = requireCredentials();

  const record = await createRecord<AttachmentFieldsShape>(
    TABLES.attachments,
    {
      [ATTACHMENT_FIELDS.filename]: input.filename,
      [ATTACHMENT_FIELDS.kind]: input.kind,
      [ATTACHMENT_FIELDS.session]: [input.sessionId],
      [ATTACHMENT_FIELDS.createdAt]: new Date().toISOString(),
    }
  );

  const uploadRes = await fetch(
    `${CONTENT_API_BASE}/${baseId}/${record.id}/${encodeURIComponent(
      ATTACHMENT_FIELDS.file
    )}/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: input.contentType,
        file: input.base64Content,
        filename: input.filename,
      }),
    }
  );

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`Airtable upload error (${uploadRes.status}): ${body}`);
  }

  const updated = await getRecord<AttachmentFieldsShape>(
    TABLES.attachments,
    record.id
  );
  return mapAttachment(updated);
}

// ---------- Suggested Questions ----------

export async function listSuggestedQuestions(
  sessionId: string
): Promise<SuggestedQuestion[]> {
  const records = await listAll<SuggestionFieldsShape>(TABLES.suggestions);
  return records
    .map(mapSuggestion)
    .filter((s) => s.sessionId === sessionId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createSuggestedQuestion(input: {
  sessionId: string;
  question: string;
  category: string;
  reason: string;
}): Promise<SuggestedQuestion> {
  const record = await createRecord<SuggestionFieldsShape>(
    TABLES.suggestions,
    {
      [SUGGESTION_FIELDS.question]: input.question,
      [SUGGESTION_FIELDS.category]: input.category,
      [SUGGESTION_FIELDS.reason]: input.reason,
      [SUGGESTION_FIELDS.status]: "pendiente",
      [SUGGESTION_FIELDS.session]: [input.sessionId],
      [SUGGESTION_FIELDS.createdAt]: new Date().toISOString(),
    }
  );
  return mapSuggestion(record);
}

export async function updateSuggestedQuestion(
  id: string,
  patch: Partial<{ status: SuggestionStatus }>
): Promise<SuggestedQuestion> {
  const fields: Partial<SuggestionFieldsShape> = {};
  if (patch.status !== undefined)
    fields[SUGGESTION_FIELDS.status] = patch.status;
  const record = await updateRecord<SuggestionFieldsShape>(
    TABLES.suggestions,
    id,
    fields
  );
  return mapSuggestion(record);
}
