import { NextResponse } from "next/server";
import { deleteRequirement, updateRequirement } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";
import type { RequirementPriority, RequirementStatus, RequirementType } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requirementId: string }> }
) {
  try {
    const { requirementId } = await params;
    const body = await request.json();
    const { description, type, priority, status } = body as {
      description?: string;
      type?: RequirementType;
      priority?: RequirementPriority;
      status?: RequirementStatus;
    };
    const requirement = await updateRequirement(requirementId, {
      description,
      type,
      priority,
      status,
    });
    return NextResponse.json({ requirement });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ requirementId: string }> }
) {
  try {
    const { requirementId } = await params;
    await deleteRequirement(requirementId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
