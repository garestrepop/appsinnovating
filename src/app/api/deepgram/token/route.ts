import { NextResponse } from "next/server";
import { createTemporaryKey, isDeepgramConfigured } from "@/lib/deepgram";
import { errorResponse } from "@/lib/api-helpers";

export async function GET() {
  if (!isDeepgramConfigured()) {
    return NextResponse.json({ configured: false });
  }
  try {
    const token = await createTemporaryKey();
    return NextResponse.json({ configured: true, ...token });
  } catch (err) {
    return errorResponse(err);
  }
}
