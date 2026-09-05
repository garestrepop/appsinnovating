export type RequirementType = "funcional" | "no_funcional";

export type RequirementPriority = "alta" | "media" | "baja";

export type RequirementStatus = "borrador" | "confirmado" | "descartado";

export interface Project {
  id: string;
  name: string;
  client: string;
  description?: string;
  driveFolderId?: string;
  createdAt: string;
}

export type SessionStatus = "programada" | "en_curso" | "finalizada";

export interface InterviewSession {
  id: string;
  projectId: string;
  title: string;
  date: string;
  status: SessionStatus;
  notes?: string;
  transcript?: string;
  driveFolderId?: string;
  createdAt: string;
}

export interface Requirement {
  id: string;
  sessionId: string;
  projectId: string;
  type: RequirementType;
  description: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  sourceQuote?: string;
  createdAt: string;
}

export type AttachmentKind = "foto" | "documento" | "audio";

export interface Attachment {
  id: string;
  sessionId: string;
  kind: AttachmentKind;
  filename: string;
  driveFileId?: string;
  url: string;
  createdAt: string;
}

export type SuggestionStatus = "pendiente" | "preguntada" | "descartada";

export interface SuggestedQuestion {
  id: string;
  sessionId: string;
  question: string;
  category: string;
  reason: string;
  status: SuggestionStatus;
  createdAt: string;
}
