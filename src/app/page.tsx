import Link from "next/link";
import { isAirtableConfigured, listProjects } from "@/lib/airtable";
import { NewProjectForm } from "@/components/NewProjectForm";
import { SetupNotice } from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured = isAirtableConfigured();
  const projects = configured ? await listProjects().catch(() => []) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Proyectos</h1>
        <p className="mt-1 text-sm text-muted">
          Agrupa tus entrevistas de levantamiento de requerimientos por proyecto de cliente.
        </p>
      </div>

      {!configured && (
        <SetupNotice message="Conecta Airtable (AIRTABLE_API_KEY y AIRTABLE_BASE_ID) para poder crear proyectos y guardar entrevistas." />
      )}

      {configured && <NewProjectForm />}

      <div className="flex flex-col gap-3">
        {configured && projects.length === 0 && (
          <p className="text-sm text-muted">
            Todavía no tienes proyectos. Crea el primero arriba.
          </p>
        )}
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent-purple hover:bg-surface-hover"
          >
            <span className="font-medium text-foreground">{project.name}</span>
            <span className="text-sm text-accent-blue">Cliente: {project.client}</span>
            {project.description && (
              <span className="mt-1 text-sm text-muted">{project.description}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
