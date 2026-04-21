import { useEffect, useRef, useState } from "react";
import { Eraser, Undo2, Trash2, Pencil, ZoomIn, ZoomOut, Maximize2, Hand } from "lucide-react";
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

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

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

  // ---- View transform (zoom & pan) ----
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const viewRef = useRef({ scale: 1, tx: 0, ty: 0 });
  useEffect(() => {
    viewRef.current = { scale, tx, ty };
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, tx, ty]);

  // Multi-touch: pinch to zoom & 2-finger pan
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number; scale: number; tx: number; ty: number } | null>(null);

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
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [height]);

  // load existing image (as background) — desenha em coords lógicas
  useEffect(() => {
    if (loadedRef.current) return;
    if (!value) { loadedRef.current = true; return; }
    const img = new Image();
    img.onload = () => {
      // Carrega como um stroke "imagem"? Mais simples: pinta direto em sizeRef no redraw via cache.
      // Aqui apenas guardamos uma flag e desenhamos via canvas auxiliar.
      bgImageRef.current = img;
      loadedRef.current = true;
      redraw();
    };
    img.src = value;
  }, [value]);

  const bgImageRef = useRef<HTMLImageElement | null>(null);

  const applyTransform = (ctx: CanvasRenderingContext2D) => {
    const dpr = dprRef.current;
    const { scale: s, tx: x, ty: y } = viewRef.current;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * x, dpr * y);
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // limpa tudo (em coords reais)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyTransform(ctx);
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, sizeRef.current.w, sizeRef.current.h);
    }
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

  // converte coords de tela -> coords lógicas (pré-zoom)
  const toLogical = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const { scale: s, tx: x, ty: y } = viewRef.current;
    return { x: (sx - x) / s, y: (sy - y) / s };
  };

  const getPos = (e: React.PointerEvent) => {
    const isPen = e.pointerType === "pen";
    const pressure = isPen
      ? (e.pressure && e.pressure > 0 ? e.pressure : 0.5)
      : 0.5;
    const { x, y } = toLogical(e.clientX, e.clientY);
    return { x, y, p: pressure };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    pointersRef.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });

    // 2 dedos -> inicia pinch/pan e cancela qualquer traço em curso
    if (pointersRef.current.size === 2) {
      if (drawingRef.current) {
        // remove o stroke iniciado por engano
        setStrokes((prev) => prev.slice(0, -1));
        drawingRef.current = null;
        activePointerRef.current = null;
      }
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchRef.current = {
        dist: Math.hypot(dx, dy) || 1,
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
        scale,
        tx,
        ty,
      };
      return;
    }

    // Se já tem mais de 1 pointer, ignora desenho
    if (pointersRef.current.size > 1) return;

    // Palm rejection
    if (pencilOnly && e.pointerType !== "pen" && e.pointerType !== "mouse") return;
    if (activePointerRef.current !== null) return;

    e.preventDefault();
    activePointerRef.current = e.pointerId;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const isPen = e.pointerType === "pen";
    const stroke: Stroke = {
      tool,
      size: tool === "eraser" ? 22 : isPen ? 1.8 : 3,
      color: tool === "eraser" ? "#000" : (() => {
        const fg = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
        return fg ? `hsl(${fg})` : "#000";
      })(),
      points: [getPos(e)],
    };
    drawingRef.current = stroke;
    setStrokes((s) => [...s, stroke]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    // Pinch / pan com 2 dedos
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.hypot(dx, dy) || 1;
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;

      const start = pinchRef.current;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, start.scale * (dist / start.dist)));

      // ponto âncora: mantém o ponto sob os dedos parado
      // logical anchor = (start.cx - start.tx) / start.scale
      const ax = (start.cx - start.tx) / start.scale;
      const ay = (start.cy - start.ty) / start.scale;
      const newTx = cx - ax * newScale;
      const newTy = cy - ay * newScale;

      setScale(newScale);
      setTx(newTx);
      setTy(newTy);
      return;
    }

    if (!drawingRef.current) return;
    if (activePointerRef.current !== e.pointerId) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const last = drawingRef.current.points[drawingRef.current.points.length - 1];
    const p = getPos(e);
    drawingRef.current.points.push(p);
    applyTransform(ctx);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = drawingRef.current.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = drawingRef.current.color;
    const dynamic = drawingRef.current.size * (0.4 + p.p * 1.2);
    ctx.lineWidth = dynamic;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const finish = (e?: React.PointerEvent) => {
    if (e) {
      pointersRef.current.delete(e.pointerId);
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (e && activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    if (!drawingRef.current) return;
    drawingRef.current = null;
    persist();
  };

  const persist = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (strokes.length === 0 && !bgImageRef.current) {
      onChange(null);
      return;
    }
    // Salva o conteúdo lógico (sem zoom): renderiza num canvas auxiliar 1:1
    const off = document.createElement("canvas");
    const dpr = dprRef.current;
    off.width = sizeRef.current.w * dpr;
    off.height = sizeRef.current.h * dpr;
    const octx = off.getContext("2d")!;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bgImageRef.current) {
      octx.drawImage(bgImageRef.current, 0, 0, sizeRef.current.w, sizeRef.current.h);
    }
    for (const s of strokes) drawStroke(octx, s);
    onChange(off.toDataURL("image/png"));
  };

  const undo = () => {
    setStrokes((s) => {
      const next = s.slice(0, -1);
      requestAnimationFrame(() => {
        redraw();
        if (next.length === 0 && !bgImageRef.current) onChange(null);
        else {
          // persist next
          const canvas = canvasRef.current;
          if (!canvas) return;
          const off = document.createElement("canvas");
          const dpr = dprRef.current;
          off.width = sizeRef.current.w * dpr;
          off.height = sizeRef.current.h * dpr;
          const octx = off.getContext("2d")!;
          octx.setTransform(dpr, 0, 0, dpr, 0, 0);
          if (bgImageRef.current) octx.drawImage(bgImageRef.current, 0, 0, sizeRef.current.w, sizeRef.current.h);
          for (const st of next) drawStroke(octx, st);
          onChange(off.toDataURL("image/png"));
        }
      });
      return next;
    });
  };

  const clear = () => {
    setStrokes([]);
    bgImageRef.current = null;
    redraw();
    onChange(null);
  };

  const zoomBy = (factor: number) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    // zoom centrado no meio do canvas
    const cx = sizeRef.current.w / 2;
    const cy = sizeRef.current.h / 2;
    const ax = (cx - tx) / scale;
    const ay = (cy - ty) / scale;
    setScale(newScale);
    setTx(cx - ax * newScale);
    setTy(cy - ay * newScale);
  };

  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  // wheel zoom (trackpad/desktop) com Ctrl/⌘
  const onWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    const ax = (cx - tx) / scale;
    const ay = (cy - ty) / scale;
    setScale(newScale);
    setTx(cx - ax * newScale);
    setTy(cy - ay * newScale);
  };

  return (
    <div className={cn("border border-border rounded-md bg-background overflow-hidden", className)}>
      <div className="flex items-center gap-1 border-b border-border px-2 py-1 flex-wrap">
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
          title="Só Apple Pencil desenha (palm rejection). Dois dedos sempre dão zoom/pan."
        >
          {pencilOnly ? "Só Pencil" : "Pencil + dedo"}
        </button>

        <div className="mx-2 h-5 w-px bg-border" />

        <Button type="button" size="sm" variant="ghost" onClick={() => zoomBy(1 / 1.25)} title="Diminuir zoom">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button type="button" size="sm" variant="ghost" onClick={() => zoomBy(1.25)} title="Aumentar zoom">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={resetView} title="Resetar zoom (100%)">
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground mr-1">
            <Hand className="h-3 w-3" /> 2 dedos = zoom/mover
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={undo} title="Desfazer">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clear} title="Limpar">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={wrapperRef} className="w-full bg-muted/20 pencil-surface relative" style={{ height }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={finish}
          onWheel={onWheel}
          className="touch-none cursor-crosshair pencil-surface"
          style={{ touchAction: "none" }}
        />
      </div>
    </div>
  );
}
