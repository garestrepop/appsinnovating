import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, listRequirements, listSessions } from "@/lib/airtable";
import { NewSessionForm } from "@/components/NewSessionForm";
import { cardClass } from "@/lib/ui";
import type { SessionStatus } from "@/lib/types";

const STATUS_LABEL: Record<SessionStatus, string> = {
  programada: "Programada",
  en_curso: "En curso",
  finalizada: "Finalizada",
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  programada: "bg-white/10 text-muted",
  en_curso: "bg-accent-blue/20 text-accent-blue",
  finalizada: "bg-accent-purple/20 text-accent-purple",
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
        <Link href="/" className="text-sm text-accent-blue hover:text-accent-purple hover:underline">
          ← Todos los proyectos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{project.name}</h1>
        <p className="text-sm text-muted">Cliente: {project.client}</p>
        {project.description && (
          <p className="mt-1 text-sm text-muted">{project.description}</p>
        )}
      </div>

      <div className="flex gap-3">
        <div className={cardClass}>
          <p className="text-xs text-muted">Requerimientos funcionales</p>
          <p className="text-xl font-semibold text-accent-purple">{funcionales}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs text-muted">No funcionales</p>
          <p className="text-xl font-semibold text-accent-blue">{noFuncionales}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs text-muted">Sesiones</p>
          <p className="text-xl font-semibold text-foreground">{sessions.length}</p>
        </div>
      </div>

      <NewSessionForm projectId={projectId} />

      <div className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Sesiones</h2>
        {sessions.length === 0 && (
          <p className="text-sm text-muted">Aún no hay sesiones para este proyecto.</p>
        )}
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/projects/${projectId}/sessions/${session.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent-purple hover:bg-surface-hover"
          >
            <div>
              <p className="font-medium text-foreground">{session.title}</p>
              <p className="text-sm text-muted">
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
