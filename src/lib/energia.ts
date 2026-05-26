// Framework de Energia — TOPO / MEIO / FUNDO
// Conceito único usado em todo o módulo de Conteúdo.

export type Energia = "topo" | "meio" | "fundo";

export const ENERGIAS: Energia[] = ["topo", "meio", "fundo"];

export interface EnergiaMeta {
  key: Energia;
  label: string;
  curto: string; // ex: "Identificação"
  descricao: string;
  exemplo: string;
  badge: string; // classes de cor para badge
  dot: string; // classe para bolinha cheia
  dotEmpty: string; // classe para bolinha vazia
  border: string; // borda accent quando selecionado
  bg: string; // bg suave para card selecionado
  promptDirective: string; // instrução injetada no prompt da IA
  checklist: string[]; // checklist de publicação
}

export const ENERGIA_META: Record<Energia, EnergiaMeta> = {
  topo: {
    key: "topo",
    label: "TOPO · Identificação",
    curto: "Identificação",
    descricao:
      "Faz a pessoa se reconhecer. Cena cotidiana, sentimento universal, sem solução pronta. O objetivo é dar nome ao que ela sente.",
    exemplo: 'Ex: "Aquele silêncio na hora do jantar não é falta de assunto — é cansaço de explicar."',
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
    dotEmpty: "border border-amber-500/40",
    border: "border-amber-500/60",
    bg: "bg-amber-500/5",
    promptDirective: `ENERGIA DESTE CONTEÚDO: TOPO (Identificação).
O conteúdo deve fazer a pessoa pensar "isso sou eu". Comece por uma cena, um sentimento ou uma observação que ela reconheça imediatamente — sem jargão, sem conceito, sem solução. Termine deixando a ferida nomeada, não tratada. É um conteúdo que abre a percepção, não que ensina.`,
    checklist: [
      "Abre por uma cena, sentimento ou observação reconhecível",
      "Não tenta ensinar nem oferecer solução",
      "Termina com algo que faz a pessoa pensar, não agir",
      "Sem jargão clínico exposto",
    ],
  },
  meio: {
    key: "meio",
    label: "MEIO · Confiança Clínica",
    curto: "Confiança Clínica",
    descricao:
      "Mostra como você pensa. Traduz um conceito (IBCT, Gottman) em comportamento cotidiano. A pessoa percebe que tem alguém que entende de verdade.",
    exemplo: 'Ex: "Brigar pelo mesmo tema todo mês não é falta de amor — é um padrão de evitação. E ele tem nome."',
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dot: "bg-sky-500",
    dotEmpty: "border border-sky-500/40",
    border: "border-sky-500/60",
    bg: "bg-sky-500/5",
    promptDirective: `ENERGIA DESTE CONTEÚDO: MEIO (Confiança Clínica).
O conteúdo deve mostrar como a psicóloga PENSA. Traga um conceito clínico (IBCT ou Gottman) e traduza em comportamento cotidiano. Construa autoridade pela clareza, não pela complexidade. A pessoa deve sair pensando "essa profissional entende de verdade".`,
    checklist: [
      "Traz um conceito clínico traduzido em comportamento real",
      "Mostra raciocínio, não só conclusão",
      "Tem clareza sem soar acadêmico",
      "Constrói autoridade pela precisão",
    ],
  },
  fundo: {
    key: "fundo",
    label: "FUNDO · Reduzir Resistência",
    curto: "Reduzir Resistência",
    descricao:
      "Convida para a terapia sem empurrar. Trata medos comuns: vergonha, custo, dúvida sobre 'se funciona'. Conduz à decisão.",
    exemplo: 'Ex: "Você não precisa estar em crise para começar. A maioria dos casais que atendo veio antes do colapso."',
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
    dotEmpty: "border border-emerald-500/40",
    border: "border-emerald-500/60",
    bg: "bg-emerald-500/5",
    promptDirective: `ENERGIA DESTE CONTEÚDO: FUNDO (Reduzir Resistência).
O conteúdo deve reduzir a resistência da pessoa em buscar terapia. Aborde um medo comum (vergonha, custo, "será que funciona", "será que é grave"), responda com calma e termine com um convite suave para o próximo passo. NÃO use venda agressiva — use presença.`,
    checklist: [
      "Aborda um medo ou objeção específica sobre buscar terapia",
      "Tem um CTA presente, sem ser pressão de venda",
      "Tom calmo, acolhedor, sem urgência fabricada",
      "Termina convidando para uma ação concreta",
    ],
  },
};

// Distribuição alvo de uma semana saudável
export const DISTRIBUICAO_ALVO: Record<Energia, number> = {
  topo: 3,
  meio: 1,
  fundo: 1,
};

export const TOTAL_SEMANA = DISTRIBUICAO_ALVO.topo + DISTRIBUICAO_ALVO.meio + DISTRIBUICAO_ALVO.fundo;

export function proximaEnergiaNecessaria(
  distrib: Record<Energia, number>,
): Energia | null {
  // Prioriza a que está mais distante do alvo proporcionalmente
  let melhor: Energia | null = null;
  let pior = -Infinity;
  for (const e of ENERGIAS) {
    const falta = DISTRIBUICAO_ALVO[e] - distrib[e];
    if (falta > 0 && falta > pior) {
      pior = falta;
      melhor = e;
    }
  }
  return melhor;
}

export function semanaCompleta(distrib: Record<Energia, number>): boolean {
  return ENERGIAS.every((e) => distrib[e] >= DISTRIBUICAO_ALVO[e]);
}
