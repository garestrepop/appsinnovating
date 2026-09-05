"use client";

import { cardClass, inputClass } from "@/lib/ui";

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
    <div className={`flex flex-col gap-2 ${cardClass}`}>
      <h2 className="font-medium text-foreground">Transcripción</h2>
      <textarea
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Aquí aparecerá la transcripción en vivo. También puedes escribir o corregir manualmente."
        rows={12}
        className={`w-full resize-y leading-relaxed ${inputClass}`}
      />
      {interimText && (
        <p className="text-sm italic text-accent-blue/70">{interimText}</p>
      )}
    </div>
  );
}
