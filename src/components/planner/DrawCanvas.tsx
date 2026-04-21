import { useEffect, useRef, useState } from "react";
import { Eraser, Undo2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
  className?: string;
}

type Tool = "pen" | "eraser";
type Stroke = { tool: Tool; size: number; color: string; points: { x: number; y: number; p: number }[] };

export function DrawCanvas({ value, onChange, height = 320, className }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [pencilOnly, setPencilOnly] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const dprRef = useRef<number>(1);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const loadedRef = useRef(false);

  // setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const resize = () => {
      const w = wrapper.clientWidth;
      sizeRef.current = { w, h: height };
      canvas.width = w * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [height]);

  // load existing image (as background)
  useEffect(() => {
    if (loadedRef.current) return;
    if (!value) { loadedRef.current = true; return; }
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, sizeRef.current.w, sizeRef.current.h);
      loadedRef.current = true;
    };
    img.src = value;
  }, [value]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);
    for (const s of strokes) drawStroke(ctx, s);
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (s.points.length === 0) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.beginPath();
    for (let i = 0; i < s.points.length; i++) {
      const p = s.points[i];
      const w = s.size * (0.5 + p.p);
      ctx.lineWidth = w;
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    // Apple Pencil reporta pressão real (0..1). Mouse/dedo geralmente vem 0 ou 0.5.
    const isPen = e.pointerType === "pen";
    const pressure = isPen
      ? (e.pressure && e.pressure > 0 ? e.pressure : 0.5)
      : 0.5;
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      p: pressure,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Palm rejection: se pencilOnly e o input não é Pencil/Mouse, ignora
    if (pencilOnly && e.pointerType !== "pen" && e.pointerType !== "mouse") return;
    // Ignora dedo "extra" enquanto desenha (multi-toque acidental)
    if (activePointerRef.current !== null) return;
    e.preventDefault();
    activePointerRef.current = e.pointerId;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const isPen = e.pointerType === "pen";
    const stroke: Stroke = {
      tool,
      // Pencil = linha mais fina, com pressão ampliando; dedo = linha mais cheia
      size: tool === "eraser" ? 22 : isPen ? 1.8 : 3,
      color: tool === "eraser" ? "#000" : "hsl(var(--foreground))",
      points: [getPos(e)],
    };
    drawingRef.current = stroke;
    setStrokes((s) => [...s, stroke]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    if (activePointerRef.current !== e.pointerId) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const last = drawingRef.current.points[drawingRef.current.points.length - 1];
    const p = getPos(e);
    drawingRef.current.points.push(p);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = drawingRef.current.tool === "eraser" ? "destination-out" : "source-over";
    if (drawingRef.current.tool !== "eraser") {
      const fg = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
      ctx.strokeStyle = fg ? `hsl(${fg})` : "#000";
    } else {
      ctx.strokeStyle = "#000";
    }
    // Pressão amplifica espessura — dá sensação de caneta real no Pencil
    const dynamic = drawingRef.current.size * (0.4 + p.p * 1.2);
    ctx.lineWidth = dynamic;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const finish = (e?: React.PointerEvent) => {
    if (e && activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    if (!drawingRef.current) return;
    drawingRef.current = null;
    persist();
  };

  const persist = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isEmpty = strokes.length === 0;
    if (isEmpty) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  };

  const undo = () => {
    setStrokes((s) => {
      const next = s.slice(0, -1);
      requestAnimationFrame(() => {
        // redraw with new strokes
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);
          for (const st of next) drawStroke(ctx, st);
          if (next.length === 0) onChange(null);
          else onChange(canvas.toDataURL("image/png"));
        }
      });
      return next;
    });
  };

  const clear = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);
    }
    onChange(null);
  };

  return (
    <div className={cn("border border-border rounded-md bg-background overflow-hidden", className)}>
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <Button type="button" size="sm" variant={tool === "pen" ? "secondary" : "ghost"} onClick={() => setTool("pen")}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant={tool === "eraser" ? "secondary" : "ghost"} onClick={() => setTool("eraser")}>
          <Eraser className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setPencilOnly((v) => !v)}
          className={cn(
            "ml-2 text-[11px] font-medium px-2 py-1 rounded-md transition-colors",
            pencilOnly ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/50",
          )}
          title="Só Apple Pencil desenha (ignora toque do dedo / palm rejection)"
        >
          {pencilOnly ? "Só Pencil" : "Pencil + dedo"}
        </button>
        <div className="ml-auto flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={undo} title="Desfazer">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clear} title="Limpar">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={wrapperRef} className="w-full bg-muted/20 pencil-surface" style={{ height }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={finish}
          className="touch-none cursor-crosshair pencil-surface"
          style={{ touchAction: "none" }}
        />
      </div>
    </div>
  );
}
