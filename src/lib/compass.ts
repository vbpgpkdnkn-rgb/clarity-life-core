/* eslint-disable @typescript-eslint/no-explicit-any */
// Bússola unificada = memória viva do projeto.
// Vive em content_projects.context.compass.

export interface AuthorSignatureSample {
  text: string;
  role?: string;
  avg_sentence_len: number;
  has_question: boolean;
  starts_with: string;
  ends_with: string;
  at: string;
}

export interface AuthorSignature {
  samples: AuthorSignatureSample[];
  aggregate: {
    avg_sentence_len: number;
    question_ratio: number;
    common_starters: string[];
    common_enders: string[];
  };
}

export interface ProjectCompass {
  // Núcleo narrativo
  central_idea?: string;
  intent?: string;
  promise?: string;
  emotional_tension?: string;
  strategic_goal?: string;
  positioning?: string;
  tone?: string;
  emotional_goal?: string;
  // Audiência
  audience?: string;
  pains?: string[];
  desires?: string[];
  // Forma
  format?: string;
  duration_seconds?: number;
  density?: "leve" | "medio" | "denso";
  rhythm?: string;
  cta?: string;
  // Estilo
  examples?: string[];
  references?: string[];
  narrative_style?: string;
  writing_pattern?: string;
  // DNA + memória
  master_prompt?: string;
  author_signature?: AuthorSignature;
  refinement_history?: Array<{ at: string; what: string; why?: string }>;
}

export function getCompass(project: any): ProjectCompass {
  const ctx = project?.context ?? {};
  // Compatibilidade: legacy narrative_core continua sendo lido
  const legacy = ctx.narrative_core ?? {};
  return {
    intent: legacy.intent ?? ctx.intent,
    promise: legacy.promise,
    emotional_tension: legacy.tension,
    positioning: legacy.positioning ?? ctx.positioning,
    tone: legacy.tone ?? ctx.tone,
    emotional_goal: legacy.emotional_goal,
    duration_seconds: ctx.timing?.target_seconds,
    density: ctx.timing?.density,
    pains: ctx.audience?.pains,
    desires: ctx.audience?.desires,
    cta: ctx.narrative?.cta_type,
    ...(ctx.compass ?? {}),
  };
}

const STOPWORDS = new Set(["o", "a", "os", "as", "de", "da", "do", "que", "e", "para", "com", "um", "uma", "no", "na"]);

export function buildSignatureSample(text: string, role?: string): AuthorSignatureSample {
  const t = (text ?? "").trim();
  const sentences = t.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const avg = sentences.length ? sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0) / sentences.length : 0;
  const words = t.split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()));
  return {
    text: t.slice(0, 280),
    role,
    avg_sentence_len: Math.round(avg),
    has_question: /\?/.test(t),
    starts_with: words.slice(0, 3).join(" "),
    ends_with: words.slice(-3).join(" "),
    at: new Date().toISOString(),
  };
}

export function recomputeSignatureAggregate(samples: AuthorSignatureSample[]): AuthorSignature["aggregate"] {
  if (!samples.length) {
    return { avg_sentence_len: 0, question_ratio: 0, common_starters: [], common_enders: [] };
  }
  const avg = Math.round(samples.reduce((acc, s) => acc + s.avg_sentence_len, 0) / samples.length);
  const qratio = samples.filter((s) => s.has_question).length / samples.length;
  const tally = (key: "starts_with" | "ends_with") => {
    const m = new Map<string, number>();
    samples.forEach((s) => {
      const v = s[key];
      if (!v) return;
      m.set(v, (m.get(v) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v]) => v);
  };
  return { avg_sentence_len: avg, question_ratio: Number(qratio.toFixed(2)), common_starters: tally("starts_with"), common_enders: tally("ends_with") };
}

export function mergeAuthorSignature(prev: AuthorSignature | undefined, sample: AuthorSignatureSample): AuthorSignature {
  const samples = [sample, ...((prev?.samples ?? []))].slice(0, 30);
  return { samples, aggregate: recomputeSignatureAggregate(samples) };
}
