import { useState } from "react";
import { RichEditor } from "./RichEditor";
import { DrawCanvas } from "./DrawCanvas";
import { FileText, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  textValue: string;
  drawingValue: string | null;
  onTextChange: (v: string) => void;
  onDrawingChange: (v: string | null) => void;
  textPlaceholder?: string;
  drawingHeight?: number;
}

export function PencilTabs({
  textValue,
  drawingValue,
  onTextChange,
  onDrawingChange,
  textPlaceholder,
  drawingHeight = 380,
}: Props) {
  const [tab, setTab] = useState<"text" | "draw">("text");
  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setTab("text")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
            tab === "text" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
          )}
        >
          <FileText className="h-3.5 w-3.5" /> Texto
        </button>
        <button
          type="button"
          onClick={() => setTab("draw")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
            tab === "draw" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
          )}
        >
          <PenLine className="h-3.5 w-3.5" /> Desenho
        </button>
      </div>
      {tab === "text" ? (
        <RichEditor value={textValue} onChange={onTextChange} placeholder={textPlaceholder} />
      ) : (
        <DrawCanvas value={drawingValue} onChange={onDrawingChange} height={drawingHeight} />
      )}
    </div>
  );
}
