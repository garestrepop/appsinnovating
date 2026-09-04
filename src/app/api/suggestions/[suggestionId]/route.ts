import { NextResponse } from "next/server";
import { updateSuggestedQuestion } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";
import type { SuggestionStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  try {
    const { suggestionId } = await params;
    const body = await request.json();
    const { status } = body as { status?: SuggestionStatus };
    const suggestion = await updateSuggestedQuestion(suggestionId, { status });
    return NextResponse.json({ suggestion });
  } catch (err) {
    return errorResponse(err);
  }
}
