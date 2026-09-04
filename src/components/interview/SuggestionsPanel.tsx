"use client";

import { useState } from "react";
import type { SuggestedQuestion, SuggestionStatus } from "@/lib/types";

interface SuggestionsPanelProps {
  sessionId: string;
  transcript: string;
  suggestions: SuggestedQuestion[];
  onGenerated: (suggestions: SuggestedQuestion[]) => void;
  onUpdated: (suggestion: SuggestedQuestion) => void;
}

export function SuggestionsPanel({
  sessionId,
  transcript,
  suggestions,
  onGenerated,
  onUpdated,
}: SuggestionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudieron generar sugerencias");
      }
      const { suggestions: created } = await res.json();
      if (created.length > 0) onGenerated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: SuggestionStatus) {
    const res = await fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { suggestion } = await res.json();
      onUpdated(suggestion);
    }
  }

  const visible = showAll
    ? suggestions
    : suggestions.filter((s) => s.status === "pendiente");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Preguntas sugeridas</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Analizando..." : "Sugerir preguntas"}
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        Sugerencias basadas en reglas por palabras clave (placeholder mientras se
        conecta un modelo de IA). Se generan a partir de lo que hay en la transcripción.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="flex flex-col gap-2">
        {visible.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-1 rounded-md border border-zinc-200 p-3 text-sm"
          >
            <span className="w-fit rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
              {s.category}
            </span>
            <p className="font-medium">{s.question}</p>
            <p className="text-xs text-zinc-500">{s.reason}</p>
            {s.status === "pendiente" ? (
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => handleStatusChange(s.id, "preguntada")}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                >
                  Ya la pregunté
                </button>
                <button
                  onClick={() => handleStatusChange(s.id, "descartada")}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                >
                  Descartar
                </button>
              </div>
            ) : (
              <span className="mt-1 w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                {s.status === "preguntada" ? "Preguntada" : "Descartada"}
              </span>
            )}
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-sm text-zinc-400">
            No hay sugerencias pendientes. Usa &quot;Sugerir preguntas&quot; mientras avanza la entrevista.
          </li>
        )}
      </ul>

      {suggestions.length > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-xs text-indigo-600 hover:underline"
        >
          {showAll ? "Ver solo pendientes" : "Ver todas"}
        </button>
      )}
    </div>
  );
}
