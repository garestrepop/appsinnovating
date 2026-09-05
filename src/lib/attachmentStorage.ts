// Orquesta dónde vive cada adjunto: la carpeta de Google Drive se crea una
// sola vez por proyecto y por sesión, y su ID queda guardado en Airtable
// (Project.DriveFolderId / Session.DriveFolderId) para no tener que buscarla
// de nuevo en cada subida ni arriesgar carpetas duplicadas.

import { getProject, getSession, updateProject, updateSession } from "./airtable";
import { ensureFolder, getDriveRootFolderId } from "./googleDrive";

function sanitizeFolderName(name: string): string {
  return name.trim() || "Sin título";
}

export async function getOrCreateSessionDriveFolder(sessionId: string): Promise<string> {
  const session = await getSession(sessionId);
  if (session.driveFolderId) return session.driveFolderId;

  const project = await getProject(session.projectId);
  let projectFolderId = project.driveFolderId;
  if (!projectFolderId) {
    projectFolderId = await ensureFolder(
      getDriveRootFolderId(),
      sanitizeFolderName(`${project.name} — ${project.client}`)
    );
    await updateProject(project.id, { driveFolderId: projectFolderId });
  }

  const sessionFolderId = await ensureFolder(
    projectFolderId,
    sanitizeFolderName(session.title)
  );
  await updateSession(session.id, { driveFolderId: sessionFolderId });
  return sessionFolderId;
}
