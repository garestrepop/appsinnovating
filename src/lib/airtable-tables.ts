// Nombres de tablas y campos esperados en la base de Airtable.
// Deben coincidir exactamente con la base que el usuario cree siguiendo el README.

export const TABLES = {
  projects: "Projects",
  sessions: "Sessions",
  requirements: "Requirements",
  attachments: "Attachments",
  suggestions: "SuggestedQuestions",
} as const;

export const PROJECT_FIELDS = {
  name: "Name",
  client: "Client",
  description: "Description",
  createdAt: "CreatedAt",
} as const;

export const SESSION_FIELDS = {
  title: "Title",
  project: "Project",
  date: "Date",
  status: "Status",
  notes: "Notes",
  transcript: "Transcript",
  createdAt: "CreatedAt",
} as const;

export const REQUIREMENT_FIELDS = {
  description: "Description",
  type: "Type",
  priority: "Priority",
  status: "Status",
  sourceQuote: "SourceQuote",
  session: "Session",
  project: "Project",
  createdAt: "CreatedAt",
} as const;

export const ATTACHMENT_FIELDS = {
  filename: "Filename",
  kind: "Kind",
  file: "File",
  session: "Session",
  createdAt: "CreatedAt",
} as const;

export const SUGGESTION_FIELDS = {
  question: "Question",
  category: "Category",
  reason: "Reason",
  status: "Status",
  session: "Session",
  createdAt: "CreatedAt",
} as const;
