"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/ui";

export function NewSessionForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date: new Date(date).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo crear la sesión");
      }
      const { session } = await res.json();
      router.push(`/projects/${projectId}/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${cardClass}`}>
      <h2 className="font-medium text-foreground">Nueva sesión / entrevista</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Título (ej. Entrevista inicial con gerencia)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={submitting} className={`self-start ${primaryButtonClass}`}>
        {submitting ? "Creando..." : "Crear e iniciar sesión"}
      </button>
    </form>
  );
}
