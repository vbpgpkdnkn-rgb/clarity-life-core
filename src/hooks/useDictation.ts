import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook para ditado por voz usando Web Speech API.
 * Funciona nativamente no Safari (iPad/iPhone) e Chrome/Edge.
 * Não consome créditos — usa o reconhecimento do próprio navegador/iOS.
 */

type SpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

interface UseDictationOptions {
  lang?: string;
  continuous?: boolean;
  onFinal?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
}

export function useDictation({
  lang = "pt-BR",
  continuous = true,
  onFinal,
  onInterim,
}: UseDictationOptions = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const supported = typeof window !== "undefined" &&
    (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));

  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError("Seu navegador não suporta ditado por voz. Use Safari ou Chrome.");
      return;
    }
    setError(null);
    setInterim("");

    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (interimText) {
        setInterim(interimText);
        onInterimRef.current?.(interimText);
      }
      if (finalText) {
        setInterim("");
        onFinalRef.current?.(finalText.trim());
      }
    };

    rec.onerror = (e: any) => {
      const msg = e.error === "not-allowed"
        ? "Permissão do microfone negada"
        : e.error === "no-speech"
        ? "Não captei nenhuma fala"
        : `Erro: ${e.error}`;
      setError(msg);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err: any) {
      setError(err?.message ?? "Falha ao iniciar microfone");
    }
  }, [lang, continuous, supported]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, interim, error, supported, start, stop, toggle };
}
