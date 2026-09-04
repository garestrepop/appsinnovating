import { NextResponse } from "next/server";
import { createRequirement, getSession, listRequirements } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";
import type { RequirementPriority, RequirementType } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const requirements = await listRequirements({ sessionId });
    return NextResponse.json({ requirements });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { type, description, priority, sourceQuote } = body as {
      type?: RequirementType;
      description?: string;
      priority?: RequirementPriority;
      sourceQuote?: string;
    };
    if (!type || !description) {
      return NextResponse.json(
        { error: "type y description son obligatorios" },
        { status: 400 }
      );
    }
    const session = await getSession(sessionId);
    const requirement = await createRequirement({
      sessionId,
      projectId: session.projectId,
      type,
      description,
      priority: priority ?? "media",
      sourceQuote,
    });
    return NextResponse.json({ requirement }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
