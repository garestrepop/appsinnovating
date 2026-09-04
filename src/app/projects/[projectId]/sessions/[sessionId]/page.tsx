import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSession,
  listAttachments,
  listRequirements,
  listSuggestedQuestions,
} from "@/lib/airtable";
import { isDeepgramConfigured } from "@/lib/deepgram";
import { InterviewWorkspace } from "@/components/interview/InterviewWorkspace";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId, sessionId } = await params;

  const session = await getSession(sessionId).catch(() => null);
  if (!session) notFound();

  const [requirements, suggestions, attachments] = await Promise.all([
    listRequirements({ sessionId }),
    listSuggestedQuestions(sessionId),
    listAttachments(sessionId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/projects/${projectId}`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Volver al proyecto
      </Link>
      <InterviewWorkspace
        session={session}
        projectId={projectId}
        initialRequirements={requirements}
        initialSuggestions={suggestions}
        initialAttachments={attachments}
        deepgramConfigured={isDeepgramConfigured()}
      />
    </div>
  );
}
