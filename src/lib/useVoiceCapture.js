import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { transcribeCapture } from "./server-fns";

/**
 * Voice-ready capture: record in the browser, store the audio privately,
 * transcribe on the server. Typing always remains available.
 */
export function useVoiceCapture({ onText }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef(null);
  const chunks = useRef([]);

  const start = async () => {
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't record audio. You can still type.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (event) => {
        if (event.data?.size) chunks.current.push(event.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const blob = new Blob(chunks.current, { type: "audio/webm" });
          const file = new File([blob], "capture.webm", { type: "audio/webm" });
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
          const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
          const { text } = await transcribeCapture({ data: { file_url: signed_url } });
          if (text) onText?.(text);
          else setError("I couldn't make out any words in that recording.");
        } catch (err) {
          setError(err?.message || "Could not transcribe that recording.");
        } finally {
          setTranscribing(false);
        }
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      setError("Microphone access is unavailable. You can still type.");
    }
  };

  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  return { recording, transcribing, error, start, stop, setError };
}