import { NextResponse } from "next/server";

export function errorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "Error inesperado";
  const status = message.includes("no está configurado") ? 412 : 500;
  return NextResponse.json({ error: message }, { status });
}
