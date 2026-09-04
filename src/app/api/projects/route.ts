import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/airtable";
import { errorResponse } from "@/lib/api-helpers";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, client, description } = body as {
      name?: string;
      client?: string;
      description?: string;
    };
    if (!name || !client) {
      return NextResponse.json(
        { error: "name y client son obligatorios" },
        { status: 400 }
      );
    }
    const project = await createProject({ name, client, description });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
