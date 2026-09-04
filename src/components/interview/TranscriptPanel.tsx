"use client";

interface TranscriptPanelProps {
  transcript: string;
  interimText: string;
  onChange: (value: string) => void;
}

export function TranscriptPanel({
  transcript,
  interimText,
  onChange,
}: TranscriptPanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="font-medium">Transcripción</h2>
      <textarea
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Aquí aparecerá la transcripción en vivo. También puedes escribir o corregir manualmente."
        rows={12}
        className="w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm leading-relaxed"
      />
      {interimText && (
        <p className="text-sm italic text-zinc-400">{interimText}</p>
      )}
    </div>
  );
}
