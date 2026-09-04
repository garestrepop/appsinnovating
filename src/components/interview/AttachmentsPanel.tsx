"use client";

import { useRef, useState } from "react";
import type { Attachment, AttachmentKind } from "@/lib/types";

interface AttachmentsPanelProps {
  sessionId: string;
  attachments: Attachment[];
  onUploaded: (attachment: Attachment) => void;
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadAttachment(
  sessionId: string,
  filename: string,
  contentType: string,
  kind: AttachmentKind,
  file: Blob
): Promise<Attachment> {
  const base64Content = await fileToBase64(file);
  const res = await fetch(`/api/sessions/${sessionId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, base64Content, kind }),
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
      const attachment = await uploadAttachment(
        sessionId,
        file.name,
        file.type || "application/octet-stream",
        kind,
        file
      );
      onUploaded(attachment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="font-medium">Fotos y documentos</h2>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleFileChange}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && <p className="text-xs text-zinc-500">Subiendo...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="flex flex-col gap-1">
        {attachments.map((a) => (
          <li key={a.id} className="text-sm">
            <a
              href={a.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {a.kind === "foto" ? "🖼️" : a.kind === "audio" ? "🎧" : "📄"} {a.filename}
            </a>
          </li>
        ))}
        {attachments.length === 0 && (
          <li className="text-sm text-zinc-400">Sin archivos todavía.</li>
        )}
      </ul>
    </div>
  );
}
