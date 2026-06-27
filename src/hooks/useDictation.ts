import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook para ditado por voz usando Web Speech API.
 * Funciona nativamente no Safari (iPad/iPhone) e Chrome/Edge.
 * Não consome créditos — usa o reconhecimento do próprio navegador/iOS.
 */

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};
type SpeechRecognitionErrorLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supported = typeof window !== "undefined" &&
    (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));

  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current = null;
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError("Seu navegador não suporta ditado por voz. Use Safari ou Chrome.");
      return;
    }
    setError(null);
    setInterim("");
    shouldListenRef.current = true;

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructorLike;
      webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
    };
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;

    rec.onresult = (event) => {
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

    rec.onerror = (e) => {
      const msg = e.error === "not-allowed"
        ? "Permissão do microfone negada"
        : e.error === "no-speech"
        ? null
        : `Erro: ${e.error}`;
      if (msg) setError(msg);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        shouldListenRef.current = false;
      }
    };

    rec.onend = () => {
      setInterim("");
      recognitionRef.current = null;
      if (shouldListenRef.current && continuous) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) start();
        }, 250);
        return;
      }
      setListening(false);
    };

    try {
      try {
        recognitionRef.current?.stop();
      } catch {
        recognitionRef.current = null;
      }
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err: unknown) {
      shouldListenRef.current = false;
      setError(err instanceof Error ? err.message : "Falha ao iniciar microfone");
    }
  }, [lang, continuous, supported]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, interim, error, supported, start, stop, toggle };
}
