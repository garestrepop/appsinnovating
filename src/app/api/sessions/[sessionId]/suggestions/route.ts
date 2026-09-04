import { NextResponse } from "next/server";
import { createSuggestedQuestion, listSuggestedQuestions } from "@/lib/airtable";
import { generateSuggestions } from "@/lib/suggestions";
import { errorResponse } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const suggestions = await listSuggestedQuestions(sessionId);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return errorResponse(err);
  }
}

// Genera nuevas preguntas sugeridas a partir del transcript acumulado.
// Hoy usa un motor de reglas por palabras clave (ver lib/suggestions.ts);
// está pensado para reemplazarse por una llamada a un LLM sin tocar este endpoint.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { transcript } = body as { transcript?: string };

    const existing = await listSuggestedQuestions(sessionId);
    const coveredCategories = existing.map((s) => s.category);

    const newSuggestions = generateSuggestions(transcript ?? "", coveredCategories);

    const created = await Promise.all(
      newSuggestions.map((s) =>
        createSuggestedQuestion({
          sessionId,
          question: s.question,
          category: s.category,
          reason: s.reason,
        })
      )
    );

    return NextResponse.json({ suggestions: created });
  } catch (err) {
    return errorResponse(err);
  }
}
