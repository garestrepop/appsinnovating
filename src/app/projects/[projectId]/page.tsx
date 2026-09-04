import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, listRequirements, listSessions } from "@/lib/airtable";
import { NewSessionForm } from "@/components/NewSessionForm";
import type { SessionStatus } from "@/lib/types";

const STATUS_LABEL: Record<SessionStatus, string> = {
  programada: "Programada",
  en_curso: "En curso",
  finalizada: "Finalizada",
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  programada: "bg-zinc-100 text-zinc-700",
  en_curso: "bg-amber-100 text-amber-800",
  finalizada: "bg-emerald-100 text-emerald-800",
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) notFound();

  const [sessions, requirements] = await Promise.all([
    listSessions(projectId),
    listRequirements({ projectId }),
  ]);

  const funcionales = requirements.filter((r) => r.type === "funcional").length;
  const noFuncionales = requirements.filter((r) => r.type === "no_funcional").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Todos los proyectos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-zinc-600">Cliente: {project.client}</p>
        {project.description && (
          <p className="mt-1 text-sm text-zinc-600">{project.description}</p>
        )}
      </div>

      <div className="flex gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Requerimientos funcionales</p>
          <p className="text-xl font-semibold">{funcionales}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">No funcionales</p>
          <p className="text-xl font-semibold">{noFuncionales}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Sesiones</p>
          <p className="text-xl font-semibold">{sessions.length}</p>
        </div>
      </div>

      <NewSessionForm projectId={projectId} />

      <div className="flex flex-col gap-3">
        <h2 className="font-medium">Sesiones</h2>
        {sessions.length === 0 && (
          <p className="text-sm text-zinc-500">Aún no hay sesiones para este proyecto.</p>
        )}
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/projects/${projectId}/sessions/${session.id}`}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <div>
              <p className="font-medium">{session.title}</p>
              <p className="text-sm text-zinc-500">
                {new Date(session.date).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[session.status]}`}
            >
              {STATUS_LABEL[session.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
