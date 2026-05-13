import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, X, Plus, Minus, Type, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { estimateSeconds, formatDuration } from "@/lib/timing";

interface Paragraph {
  id: string;
  role?: string;
  text?: string;
  recording_note?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  paragraphs: Paragraph[];
}

// Palavras "fortes" que merecem destaque cinematográfico
const STRONG = /\b(nunca|sempre|tudo|nada|único|verdade|impossível|garanto|prometo|confesso|segredo|essência|você|agora|hoje|mude|pare|escolha|coragem|medo|amor|dor|liberdade|propósito|sentido)\b/gi;

function decorate(text: string) {
  if (!text) return "";
  // marca palavras fortes
  let html = text.replace(STRONG, '<strong class="text-accent">$&</strong>');
  // marca pausas: "..." ou " — " viram marcador de respiração
  html = html.replace(/\.\.\./g, '<span class="opacity-40">…</span><span class="inline-block align-middle mx-1 text-accent/70">◦</span>');
  html = html.replace(/ — /g, ' <span class="inline-block align-middle text-accent/70">◦</span> ');
  return html;
}

export function TeleprompterMode({ open, onClose, title, paragraphs }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(40); // px por segundo
  const [fontSize, setFontSize] = useState(44);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const totalSec = useMemo(
    () => paragraphs.reduce((a, p) => a + estimateSeconds(p.text ?? ""), 0),
    [paragraphs],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.code === "Space") { e.preventDefault(); setPlaying((v) => !v); }
      if (e.key === "ArrowUp") setSpeed((s) => Math.min(120, s + 5));
      if (e.key === "ArrowDown") setSpeed((s) => Math.max(10, s - 5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
      return;
    }
    const tick = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = (ts - last) / 1000;
      lastTsRef.current = ts;
      const el = scrollerRef.current;
      if (el) {
        el.scrollTop += speed * dt;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) setPlaying(false);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(25_15%_6%)] text-[hsl(38_30%_94%)] flex flex-col animate-fade-in">
      {/* Top bar minimalista */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-white/5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Teleprompter</p>
          <h3 className="text-sm font-medium truncate">{title}</h3>
        </div>
        <div className="text-[10px] text-white/40 hidden md:block">
          espaço: play/pausa · ↑↓ velocidade · esc fechar · total estimado {formatDuration(totalSec)}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Texto cinematográfico */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="max-w-3xl mx-auto px-8 py-[40vh]" style={{ fontSize, lineHeight: 1.55 }}>
          {paragraphs.map((p, i) => (
            <section key={p.id} className="mb-16 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              {p.role && (
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3">
                  {p.role}
                </div>
              )}
              <p
                className="font-serif"
                style={{ fontFamily: "Fraunces, serif" }}
                dangerouslySetInnerHTML={{ __html: decorate(p.text ?? "") }}
              />
              {p.recording_note && (
                <p className="text-xs italic text-white/30 mt-4 flex items-center gap-2">
                  <Wind className="h-3 w-3" /> {p.recording_note}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>

      {/* Linha-guia central (foco cinematográfico) */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Controles inferiores */}
      <div className="border-t border-white/5 px-6 py-3 flex items-center gap-6 flex-wrap bg-black/40 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPlaying((v) => !v)}
          className="text-white hover:bg-white/10 gap-2"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pausar" : "Iniciar"}
        </Button>

        <div className="flex items-center gap-2 min-w-[180px]">
          <Wind className="h-3.5 w-3.5 text-white/40" />
          <span className="text-[10px] uppercase tracking-wider text-white/40 w-16">Ritmo</span>
          <Slider
            value={[speed]} min={10} max={120} step={5}
            onValueChange={(v) => setSpeed(v[0])}
            className="flex-1"
          />
          <span className="text-[10px] text-white/40 w-10 text-right">{speed}</span>
        </div>

        <div className="flex items-center gap-1">
          <Type className="h-3.5 w-3.5 text-white/40" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/70 hover:bg-white/10" onClick={() => setFontSize((f) => Math.max(24, f - 4))}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-white/40 w-8 text-center">{fontSize}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/70 hover:bg-white/10" onClick={() => setFontSize((f) => Math.min(80, f + 4))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="ml-auto text-[10px] text-white/30 hidden lg:flex items-center gap-3">
          <span>● palavras-chave em destaque</span>
          <span>◦ marcador de respiração</span>
        </div>
      </div>
    </div>
  );
}
