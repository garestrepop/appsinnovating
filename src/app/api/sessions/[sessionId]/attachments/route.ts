import { NextResponse } from "next/server";
import { createAttachment, listAttachments } from "@/lib/airtable";
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

// El archivo se envía como base64 en JSON (no multipart) para mantener
// el endpoint simple. Límite recomendado: ~4MB por archivo (ver README).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { filename, contentType, base64Content, kind } = body as {
      filename?: string;
      contentType?: string;
      base64Content?: string;
      kind?: AttachmentKind;
    };
    if (!filename || !contentType || !base64Content) {
      return NextResponse.json(
        { error: "filename, contentType y base64Content son obligatorios" },
        { status: 400 }
      );
    }
    const attachment = await createAttachment({
      sessionId,
      filename,
      contentType,
      base64Content,
      kind: kind ?? "documento",
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
