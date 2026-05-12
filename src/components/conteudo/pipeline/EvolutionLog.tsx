import { Card } from "@/components/ui/card";
import { History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ContentProject } from "@/hooks/useContentProject";

export function EvolutionLog({ project }: { project: ContentProject }) {
  const entries: any[] = (project.context as any)?.evolution ?? [];
  if (!entries.length) return null;

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider">Evolução</span>
      </div>
      <ul className="space-y-2 max-h-64 overflow-auto">
        {entries.slice(0, 12).map((e, i) => (
          <li key={i} className="text-[11px] border-l-2 border-primary/40 pl-2">
            <div className="text-muted-foreground">
              etapa {e.stage} · {formatDistanceToNow(new Date(e.at), { addSuffix: true, locale: ptBR })}
            </div>
            {e.why && <div className="font-medium">{e.why}</div>}
            {e.impact && <div className="italic text-muted-foreground">↳ {e.impact}</div>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
