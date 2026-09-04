import { NextResponse } from "next/server";
import { getProject } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);
    return NextResponse.json({ project });
  } catch (err) {
    return errorResponse(err);
  }
}
