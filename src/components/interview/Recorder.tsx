"use client";

import { useEffect, useRef, useState } from "react";

interface DeepgramWord {
  transcript?: string;
}
interface DeepgramMessage {
  is_final?: boolean;
  channel?: { alternatives?: DeepgramWord[] };
}

interface RecorderProps {
  deepgramConfigured: boolean;
  onTranscript: (text: string, isFinal: boolean) => void;
  onAudioReady: (blob: Blob) => void;
}

type RecorderState = "idle" | "starting" | "recording" | "stopping";

export function Recorder({
  deepgramConfigured,
  onTranscript,
  onAudioReady,
}: RecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [liveTranscriptionActive, setLiveTranscriptionActive] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  function cleanup() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    streamRef.current = null;
    mediaRecorderRef.current = null;
    socketRef.current = null;
  }

  async function connectDeepgram(): Promise<WebSocket | null> {
    try {
      const res = await fetch("/api/deepgram/token");
      const data = await res.json();
      if (!data.configured) return null;

      const params = new URLSearchParams({
        model: "nova-2",
        language: "es",
        smart_format: "true",
        interim_results: "true",
        punctuate: "true",
      });
      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params.toString()}`,
        ["token", data.key]
      );

      socket.onmessage = (event) => {
        try {
          const message: DeepgramMessage = JSON.parse(event.data);
          const text = message.channel?.alternatives?.[0]?.transcript;
          if (text) onTranscript(text, Boolean(message.is_final));
        } catch {
          // Ignorar mensajes que no sean JSON de transcripción.
        }
      };
      socket.onerror = () => setLiveTranscriptionActive(false);
      socket.onclose = () => setLiveTranscriptionActive(false);

      await new Promise<void>((resolve, reject) => {
        socket.onopen = () => resolve();
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      setLiveTranscriptionActive(true);
      return socket;
    } catch {
      setLiveTranscriptionActive(false);
      return null;
    }
  }

  async function start() {
    setError(null);
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const socket = deepgramConfigured ? await connectDeepgram() : null;
      socketRef.current = socket;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        chunksRef.current.push(event.data);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        if (blob.size > 0) onAudioReady(blob);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState("recording");
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo acceder al micrófono: ${err.message}`
          : "No se pudo acceder al micrófono."
      );
      setState("idle");
      cleanup();
    }
  }

  function stop() {
    setState("stopping");
    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN
    ) {
      socketRef.current.send(JSON.stringify({ type: "CloseStream" }));
    }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setTimeout(() => {
      socketRef.current?.close();
      setState("idle");
      setLiveTranscriptionActive(false);
    }, 300);
  }

  const isRecording = state === "recording" || state === "stopping";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={start}
            disabled={state === "starting"}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            <span className="h-2 w-2 rounded-full bg-white" />
            {state === "starting" ? "Conectando..." : "Iniciar grabación"}
          </button>
        ) : (
          <button
            onClick={stop}
            disabled={state === "stopping"}
            className="flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {state === "stopping" ? "Deteniendo..." : "Detener grabación"}
          </button>
        )}
        {isRecording && deepgramConfigured && (
          <span className="text-xs text-zinc-500">
            {liveTranscriptionActive
              ? "Transcripción en vivo activa"
              : "Grabando audio (sin transcripción en vivo)"}
          </span>
        )}
        {isRecording && !deepgramConfigured && (
          <span className="text-xs text-zinc-500">
            Grabando audio. Configura DEEPGRAM_API_KEY para transcripción en vivo.
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
