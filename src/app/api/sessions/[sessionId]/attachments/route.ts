import { NextResponse } from "next/server";
import { createAttachment, listAttachments } from "@/lib/airtable";
import { getOrCreateSessionDriveFolder } from "@/lib/attachmentStorage";
import { uploadFileToDrive } from "@/lib/googleDrive";
import { errorResponse } from "@/lib/api-helpers";
import type { AttachmentKind } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const attachments = await listAttachments(sessionId);
    return NextResponse.json({ attachments });
  } catch (err) {
    return errorResponse(err);
  }
}

// El archivo se envía como multipart/form-data y se sube a Google Drive
// (soporta archivos grandes, como grabaciones de audio largas); Airtable
// solo guarda el nombre y el enlace de Drive.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = (formData.get("kind") as AttachmentKind | null) ?? "documento";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo (file)" }, { status: 400 });
    }

    const folderId = await getOrCreateSessionDriveFolder(sessionId);
    const content = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFileToDrive({
      parentId: folderId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      content,
    });

    const attachment = await createAttachment({
      sessionId,
      filename: file.name,
      kind,
      driveFileId: uploaded.id,
      url: uploaded.url,
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
