"use client";

import { useState } from "react";
import type {
  Requirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
} from "@/lib/types";

const TYPE_LABEL: Record<RequirementType, string> = {
  funcional: "Funcional",
  no_funcional: "No funcional",
};

const PRIORITY_LABEL: Record<RequirementPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const STATUS_LABEL: Record<RequirementStatus, string> = {
  borrador: "Borrador",
  confirmado: "Confirmado",
  descartado: "Descartado",
};

interface RequirementsPanelProps {
  sessionId: string;
  requirements: Requirement[];
  onCreated: (requirement: Requirement) => void;
  onUpdated: (requirement: Requirement) => void;
}

export function RequirementsPanel({
  sessionId,
  requirements,
  onCreated,
  onUpdated,
}: RequirementsPanelProps) {
  const [type, setType] = useState<RequirementType>("funcional");
  const [priority, setPriority] = useState<RequirementPriority>("media");
  const [description, setDescription] = useState("");
  const [sourceQuote, setSourceQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          priority,
          description,
          sourceQuote: sourceQuote || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo guardar el requerimiento");
      }
      const { requirement } = await res.json();
      onCreated(requirement);
      setDescription("");
      setSourceQuote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: RequirementStatus) {
    const res = await fetch(`/api/requirements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { requirement } = await res.json();
      onUpdated(requirement);
    }
  }

  const funcionales = requirements.filter((r) => r.type === "funcional");
  const noFuncionales = requirements.filter((r) => r.type === "no_funcional");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="font-medium">Requerimientos</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RequirementType)}
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm"
          >
            <option value="funcional">Funcional</option>
            <option value="no_funcional">No funcional</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as RequirementPriority)}
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm"
          >
            <option value="alta">Prioridad alta</option>
            <option value="media">Prioridad media</option>
            <option value="baja">Prioridad baja</option>
          </select>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe el requerimiento (ej. El sistema debe permitir a un administrador crear usuarios)"
          rows={2}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          value={sourceQuote}
          onChange={(e) => setSourceQuote(e.target.value)}
          placeholder="Frase textual del cliente (opcional)"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Agregar requerimiento"}
        </button>
      </form>

      <RequirementGroup
        title={TYPE_LABEL.funcional}
        items={funcionales}
        onStatusChange={handleStatusChange}
      />
      <RequirementGroup
        title={TYPE_LABEL.no_funcional}
        items={noFuncionales}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

function RequirementGroup({
  title,
  items,
  onStatusChange,
}: {
  title: string;
  items: Requirement[];
  onStatusChange: (id: string, status: RequirementStatus) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-500">
        {title} ({items.length})
      </h3>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((req) => (
          <li
            key={req.id}
            className="flex flex-col gap-1 rounded-md border border-zinc-200 p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p>{req.description}</p>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {PRIORITY_LABEL[req.priority]}
              </span>
            </div>
            {req.sourceQuote && (
              <p className="italic text-zinc-500">“{req.sourceQuote}”</p>
            )}
            <select
              value={req.status}
              onChange={(e) =>
                onStatusChange(req.id, e.target.value as RequirementStatus)
              }
              className="mt-1 w-fit rounded-md border border-zinc-300 px-2 py-1 text-xs"
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-zinc-400">Ninguno todavía.</li>
        )}
      </ul>
    </div>
  );
}
