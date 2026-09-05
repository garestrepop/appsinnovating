"use client";

import { useRef, useState } from "react";
import { cardClass } from "@/lib/ui";
import type { Attachment, AttachmentKind } from "@/lib/types";

interface AttachmentsPanelProps {
  sessionId: string;
  attachments: Attachment[];
  onUploaded: (attachment: Attachment) => void;
}

export async function uploadAttachment(
  sessionId: string,
  filename: string,
  kind: AttachmentKind,
  file: Blob
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("kind", kind);
  const res = await fetch(`/api/sessions/${sessionId}/attachments`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "No se pudo subir el archivo");
  }
  const { attachment } = await res.json();
  return attachment;
}

export function AttachmentsPanel({
  sessionId,
  attachments,
  onUploaded,
}: AttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const kind: AttachmentKind = file.type.startsWith("image/")
        ? "foto"
        : "documento";
      const attachment = await uploadAttachment(sessionId, file.name, kind, file);
      onUploaded(attachment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${cardClass}`}>
      <h2 className="font-medium text-foreground">Fotos y documentos</h2>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleFileChange}
        disabled={uploading}
        className="text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-gradient-to-r file:from-accent-purple file:to-accent-blue file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
      />
      {uploading && <p className="text-xs text-muted">Subiendo...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <ul className="flex flex-col gap-1">
        {attachments.map((a) => (
          <li key={a.id} className="text-sm">
            <a
              href={a.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:text-accent-purple hover:underline"
            >
              {a.kind === "foto" ? "🖼️" : a.kind === "audio" ? "🎧" : "📄"} {a.filename}
            </a>
          </li>
        ))}
        {attachments.length === 0 && (
          <li className="text-sm text-muted">Sin archivos todavía.</li>
        )}
      </ul>
    </div>
  );
}
