import { useMemo } from "react";
import { useContentPieces } from "@/hooks/useContent";
import {
  DISTRIBUICAO_ALVO,
  ENERGIAS,
  proximaEnergiaNecessaria,
  semanaCompleta,
  type Energia,
} from "@/lib/energia";
import { startOfWeekISO, addDaysISO } from "@/lib/format";

export interface DistribuicaoSemana {
  weekStart: string;
  weekEnd: string;
  contagem: Record<Energia, number>;
  alvo: Record<Energia, number>;
  proxima: Energia | null;
  completa: boolean;
  total: number;
  totalAlvo: number;
}

/**
 * Lê content_pieces da semana atual (segunda → domingo) e calcula
 * a distribuição por energia. Conta peças com planned_date OU published_at
 * dentro da janela.
 */
export function useDistribuicaoSemana(): DistribuicaoSemana {
  const { data: pieces = [] } = useContentPieces();

  return useMemo(() => {
    const weekStart = startOfWeekISO();
    const weekEnd = addDaysISO(weekStart, 6);
    const contagem: Record<Energia, number> = { topo: 0, meio: 0, fundo: 0 };

    for (const p of pieces as any[]) {
      const ref = p.planned_date ?? p.published_at;
      if (!ref) continue;
      if (ref < weekStart || ref > weekEnd) continue;
      const e = p.energia as Energia | null | undefined;
      if (e && ENERGIAS.includes(e)) contagem[e] += 1;
    }

    const total = contagem.topo + contagem.meio + contagem.fundo;
    const totalAlvo = DISTRIBUICAO_ALVO.topo + DISTRIBUICAO_ALVO.meio + DISTRIBUICAO_ALVO.fundo;

    return {
      weekStart,
      weekEnd,
      contagem,
      alvo: DISTRIBUICAO_ALVO,
      proxima: proximaEnergiaNecessaria(contagem),
      completa: semanaCompleta(contagem),
      total,
      totalAlvo,
    };
  }, [pieces]);
}
