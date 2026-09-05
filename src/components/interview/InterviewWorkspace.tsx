"use client";

import { useState } from "react";
import type {
  Attachment,
  InterviewSession,
  Requirement,
  SessionStatus,
  SuggestedQuestion,
} from "@/lib/types";
import { useDebouncedSave } from "@/lib/useDebouncedSave";
import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { Recorder } from "./Recorder";
import { TranscriptPanel } from "./TranscriptPanel";
import { RequirementsPanel } from "./RequirementsPanel";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { AttachmentsPanel, uploadAttachment } from "./AttachmentsPanel";

const STATUS_LABEL: Record<SessionStatus, string> = {
  programada: "Programada",
  en_curso: "En curso",
  finalizada: "Finalizada",
};

interface InterviewWorkspaceProps {
  session: InterviewSession;
  projectId: string;
  initialRequirements: Requirement[];
  initialSuggestions: SuggestedQuestion[];
  initialAttachments: Attachment[];
  deepgramConfigured: boolean;
}

export function InterviewWorkspace({
  session,
  initialRequirements,
  initialSuggestions,
  initialAttachments,
  deepgramConfigured,
}: InterviewWorkspaceProps) {
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [transcript, setTranscript] = useState(session.transcript ?? "");
  const [interimText, setInterimText] = useState("");
  const [requirements, setRequirements] = useState(initialRequirements);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [audioNotice, setAudioNotice] = useState<{
    message: string;
    downloadUrl?: string;
  } | null>(null);

  useDebouncedSave(transcript, async (value) => {
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: value }),
    });
  });

  async function handleStatusChange(next: SessionStatus) {
    setStatus(next);
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  function handleTranscriptChunk(text: string, isFinal: boolean) {
    if (isFinal) {
      setTranscript((prev) => (prev ? `${prev.trim()} ${text}` : text));
      setInterimText("");
    } else {
      setInterimText(text);
    }
  }

  async function handleAudioReady(blob: Blob) {
    const filename = `grabacion-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
    try {
      const attachment = await uploadAttachment(
        session.id,
        filename,
        blob.type || "audio/webm",
        "audio",
        blob
      );
      setAttachments((prev) => [...prev, attachment]);
    } catch {
      const url = URL.createObjectURL(blob);
      setAudioNotice({
        message:
          "La grabación es muy grande para subirla automáticamente a Airtable (límite ~5MB por archivo). Descárgala y guárdala manualmente.",
        downloadUrl: url,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{session.title}</h1>
          <p className="text-sm text-muted">
            {new Date(session.date).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {STATUS_LABEL[status]}
          </p>
        </div>
        <div className="flex gap-2">
          {status !== "en_curso" && status !== "finalizada" && (
            <button
              onClick={() => handleStatusChange("en_curso")}
              className="rounded-md bg-accent-blue px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-blue-strong"
            >
              Iniciar sesión
            </button>
          )}
          {status !== "finalizada" && (
            <button
              onClick={() => handleStatusChange("finalizada")}
              className={`px-3 py-1.5 text-sm ${secondaryButtonClass}`}
            >
              Finalizar sesión
            </button>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <Recorder
          deepgramConfigured={deepgramConfigured}
          onTranscript={handleTranscriptChunk}
          onAudioReady={handleAudioReady}
        />
      </div>

      {audioNotice && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <p>{audioNotice.message}</p>
          {audioNotice.downloadUrl && (
            <a
              href={audioNotice.downloadUrl}
              download="grabacion.webm"
              className="mt-1 inline-block font-medium text-amber-100 underline"
            >
              Descargar grabación
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TranscriptPanel
            transcript={transcript}
            interimText={interimText}
            onChange={setTranscript}
          />
        </div>
        <SuggestionsPanel
          sessionId={session.id}
          transcript={transcript}
          suggestions={suggestions}
          onGenerated={(created) => setSuggestions((prev) => [...prev, ...created])}
          onUpdated={(updated) =>
            setSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RequirementsPanel
          sessionId={session.id}
          requirements={requirements}
          onCreated={(req) => setRequirements((prev) => [req, ...prev])}
          onUpdated={(updated) =>
            setRequirements((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
          }
        />
        <AttachmentsPanel
          sessionId={session.id}
          attachments={attachments}
          onUploaded={(a) => setAttachments((prev) => [...prev, a])}
        />
      </div>
    </div>
  );
}
