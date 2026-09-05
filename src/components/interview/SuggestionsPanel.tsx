"use client";

import { useState } from "react";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
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
    <div className={`flex flex-col gap-3 ${cardClass}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-foreground">Preguntas sugeridas</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`px-3 py-1.5 text-xs ${primaryButtonClass}`}
        >
          {loading ? "Analizando..." : "Sugerir preguntas"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Sugerencias basadas en reglas por palabras clave (placeholder mientras se
        conecta un modelo de IA). Se generan a partir de lo que hay en la transcripción.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <ul className="flex flex-col gap-2">
        {visible.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm"
          >
            <span className="w-fit rounded-full bg-accent-blue/15 px-2 py-0.5 text-xs text-accent-blue">
              {s.category}
            </span>
            <p className="font-medium text-foreground">{s.question}</p>
            <p className="text-xs text-muted">{s.reason}</p>
            {s.status === "pendiente" ? (
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => handleStatusChange(s.id, "preguntada")}
                  className={`px-2 py-1 text-xs ${secondaryButtonClass}`}
                >
                  Ya la pregunté
                </button>
                <button
                  onClick={() => handleStatusChange(s.id, "descartada")}
                  className={`px-2 py-1 text-xs ${secondaryButtonClass}`}
                >
                  Descartar
                </button>
              </div>
            ) : (
              <span className="mt-1 w-fit rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted">
                {s.status === "preguntada" ? "Preguntada" : "Descartada"}
              </span>
            )}
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-sm text-muted">
            No hay sugerencias pendientes. Usa &quot;Sugerir preguntas&quot; mientras avanza la entrevista.
          </li>
        )}
      </ul>

      {suggestions.length > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-xs text-accent-blue hover:text-accent-purple hover:underline"
        >
          {showAll ? "Ver solo pendientes" : "Ver todas"}
        </button>
      )}
    </div>
  );
}
