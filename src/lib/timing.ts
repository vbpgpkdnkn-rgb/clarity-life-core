// Engine puro de tempo e retenção (sem IA).
// Cadência média de fala em pt-BR ~ 160 wpm para vídeo curto natural.

export const DEFAULT_WPM = 160;

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateSeconds(text: string, wpm: number = DEFAULT_WPM): number {
  const words = countWords(text);
  if (!words) return 0;
  return Math.round((words / wpm) * 60);
}

export function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export interface BlockTiming {
  text: string;
  role?: string;
  target_seconds?: number;
}

export function densityScore(blocks: BlockTiming[]): number {
  // Info por segundo (palavras-fortes/segundo). Heurística simples.
  const total = blocks.reduce((acc, b) => acc + estimateSeconds(b.text), 0);
  if (!total) return 0;
  const words = blocks.reduce((acc, b) => acc + countWords(b.text), 0);
  return +(words / total).toFixed(2); // ~2.6 palavras/seg = normal
}

export type RetentionAlert = {
  severity: "info" | "warn" | "danger";
  message: string;
  block_index?: number;
};

export function retentionRisk(blocks: BlockTiming[]): RetentionAlert[] {
  const alerts: RetentionAlert[] = [];
  if (!blocks.length) return alerts;

  const hook = blocks[0];
  const hookSec = estimateSeconds(hook.text);
  if (hookSec > 10) {
    alerts.push({
      severity: "warn",
      message: `Hook com ${hookSec}s — acima de 10s costuma perder 30% nos primeiros segundos.`,
      block_index: 0,
    });
  }
  if (hookSec < 3 && countWords(hook.text) < 6) {
    alerts.push({
      severity: "info",
      message: "Hook muito curto — pode faltar gancho emocional.",
      block_index: 0,
    });
  }

  blocks.forEach((b, i) => {
    const sec = estimateSeconds(b.text);
    const target = b.target_seconds;
    if (target && sec > target * 1.3) {
      alerts.push({
        severity: "warn",
        message: `${b.role ?? `Bloco ${i + 1}`} com ${sec}s (alvo ${target}s). Considere cortar.`,
        block_index: i,
      });
    }
  });

  const last = blocks[blocks.length - 1];
  const ctas = (last?.text ?? "").match(/\b(comente|salve|compartilhe|siga|clique|envie|marque|baixe|inscreva|agende)\b/gi);
  if (ctas && ctas.length > 3) {
    alerts.push({
      severity: "danger",
      message: `CTA com ${ctas.length} ações — escolha apenas uma.`,
      block_index: blocks.length - 1,
    });
  }

  const totalSec = blocks.reduce((acc, b) => acc + estimateSeconds(b.text), 0);
  if (totalSec > 90) {
    alerts.push({
      severity: "warn",
      message: `Roteiro total: ${formatDuration(totalSec)} — para Reels ideal entre 30s e 60s.`,
    });
  }

  const d = densityScore(blocks);
  if (d > 3.2) {
    alerts.push({
      severity: "warn",
      message: `Densidade ${d} palavras/seg — informação demais. Reduza adjetivos ou divida em 2 vídeos.`,
    });
  }

  return alerts;
}

export function totalSeconds(blocks: BlockTiming[]): number {
  return blocks.reduce((acc, b) => acc + estimateSeconds(b.text), 0);
}
