import { Copy, Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ScriptBlock = { role?: string; text?: string; target_seconds?: number };
type Annotation = { block_id?: string; type?: string; severity?: string; message?: string; suggestion?: string };

const downloadFile = (filename: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const cleanText = (paragraphs: ScriptBlock[]) => paragraphs.map((p) => p.text ?? "").join("\n\n");

const annotatedMarkdown = (paragraphs: ScriptBlock[], annotations: Annotation[]) =>
  paragraphs
    .map((p, i) => {
      const notes = annotations.filter((a) => a.block_id === (p as any).id);
      const body = [`## ${p.role ?? `Bloco ${i + 1}`}`, p.text ?? ""];
      if (notes.length) {
        body.push(
          "",
          "### Notas de revisão",
          ...notes.map((n) => `- **${n.type ?? "ajuste"}** (${n.severity ?? "médio"}): ${n.message ?? ""}\n  Sugestão: ${n.suggestion ?? ""}`),
        );
      }
      return body.join("\n");
    })
    .join("\n\n---\n\n");

export function ExportControls({ paragraphs, annotations = [] }: { paragraphs: ScriptBlock[]; annotations?: Annotation[] }) {
  const title = `roteiro-${new Date().toISOString().slice(0, 10)}`;
  const text = cleanText(paragraphs);
  const markdown = annotatedMarkdown(paragraphs, annotations);

  const printPdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:system-ui,sans-serif;line-height:1.65;padding:40px;max-width:760px;margin:auto}h1{font-size:22px}p{white-space:pre-wrap;font-size:16px}.note{border-left:3px solid #888;padding-left:12px;color:#555;font-size:13px}</style></head><body><h1>Roteiro</h1>${paragraphs.map((p: any) => `<section><h2>${p.role ?? "Bloco"}</h2><p>${String(p.text ?? "").replace(/</g, "&lt;")}</p>${annotations.filter((a) => a.block_id === p.id).map((a) => `<div class="note">${a.message ?? ""}<br/><strong>Sugestão:</strong> ${a.suggestion ?? ""}</div>`).join("")}</section>`).join("")}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="flex flex-wrap gap-1 justify-end">
      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Roteiro copiado"))}>
        <Copy className="h-3 w-3 mr-1" /> Copiar
      </Button>
      <Button size="sm" variant="outline" onClick={() => downloadFile(`${title}.txt`, "text/plain;charset=utf-8", text)}>
        <Download className="h-3 w-3 mr-1" /> TXT
      </Button>
      <Button size="sm" variant="outline" onClick={() => downloadFile(`${title}.md`, "text/markdown;charset=utf-8", markdown)}>
        <FileText className="h-3 w-3 mr-1" /> Markdown
      </Button>
      <Button size="sm" variant="outline" onClick={printPdf}>
        <Printer className="h-3 w-3 mr-1" /> PDF
      </Button>
    </div>
  );
}