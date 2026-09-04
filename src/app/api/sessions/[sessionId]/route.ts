import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";
import type { SessionStatus } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);
    return NextResponse.json({ session });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { title, status, notes, transcript } = body as {
      title?: string;
      status?: SessionStatus;
      notes?: string;
      transcript?: string;
    };
    const session = await updateSession(sessionId, {
      title,
      status,
      notes,
      transcript,
    });
    return NextResponse.json({ session });
  } catch (err) {
    return errorResponse(err);
  }
}
