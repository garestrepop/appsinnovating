import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const sessions = await listSessions(projectId);
    return NextResponse.json({ sessions });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { title, date } = body as { title?: string; date?: string };
    if (!title) {
      return NextResponse.json({ error: "title es obligatorio" }, { status: 400 });
    }
    const session = await createSession({
      projectId,
      title,
      date: date ?? new Date().toISOString(),
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
