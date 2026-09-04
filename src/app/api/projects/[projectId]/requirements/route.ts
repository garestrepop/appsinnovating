import { NextResponse } from "next/server";
import { listRequirements } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const requirements = await listRequirements({ projectId });
    return NextResponse.json({ requirements });
  } catch (err) {
    return errorResponse(err);
  }
}
