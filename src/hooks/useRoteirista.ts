import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpsertPiece, ContentFormat } from "@/hooks/useContent";
import { toast } from "sonner";

export type ChatMsg = { role: "user" | "ai"; content: string; isRoteiro?: boolean };

const formatMap: Record<string, ContentFormat> = {
  Reel: "reels",
  Carrossel: "carrossel",
  Legenda: "texto",
  Série: "video",
};

function extractGancho(texto: string): string {
  const lines = texto.split("\n");
  const idx = lines.findIndex((l) => l.trim().toLowerCase() === "gancho");
  if (idx === -1) return texto.slice(0, 80);
  for (let i = idx + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t) return t;
  }
  return texto.slice(0, 80);
}

export function useRoteirista() {
  const [isLoading, setIsLoading] = useState(false);
  const upsertPiece = useUpsertPiece();

  const sendMessage = async (messages: ChatMsg[], formato: string): Promise<string> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("roteirista-agent", {
        body: { messages, formato },
      });
      if (error) throw error;
      return (data as any)?.content ?? "";
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao chamar roteirista");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const saveRoteiro = async (texto: string, formato: string) => {
    const gancho = extractGancho(texto);
    const title = gancho.slice(0, 80);
    await upsertPiece.mutateAsync({
      title,
      script: texto,
      hook: gancho,
      format: formatMap[formato] ?? "reels",
      status: "em_producao",
      pipeline_stage: "roteiro_pronto",
      scope: "profissional",
    } as any);
  };

  return { sendMessage, isLoading, saveRoteiro };
}
