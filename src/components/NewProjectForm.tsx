"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/ui";

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, client, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo crear el proyecto");
      }
      setName("");
      setClient("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${cardClass}`}>
      <h2 className="font-medium text-foreground">Nuevo proyecto</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Nombre del proyecto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          required
          placeholder="Cliente"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className={inputClass}
        />
      </div>
      <textarea
        placeholder="Descripción breve (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={inputClass}
        rows={2}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={submitting} className={`self-start ${primaryButtonClass}`}>
        {submitting ? "Creando..." : "Crear proyecto"}
      </button>
    </form>
  );
}
