import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clapperboard, Film, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type Piece = {
  id: string;
  title: string | null;
  theme: string | null;
  phase: number | null;
  status: string | null;
  scope: string | null;
  energia: string | null;
  creation_strategy: string | null;
  planned_date: string | null;
  series_name: string | null;
  series_position: number | null;
  updated_at: string;
};

const PHASES = [
  { n: 1, label: "Tema" },
  { n: 2, label: "Estratégia" },
  { n: 3, label: "Roteiro" },
  { n: 4, label: "Produção" },
  { n: 5, label: "Desempenho" },
];

const energiaBadge = (energia: string | null) => {
  if (!energia) return null;
  const map: Record<string, string> = {
    topo: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    meio: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    fundo: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  };
  const cls = map[energia.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`}>
      {energia}
    </Badge>
  );
};

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
};

export default function Studio() {
  const qc = useQueryClient();
  const [view, setView] = useState<"biblioteca" | "foco">("biblioteca");
  const [activeId, setActiveId] = useState<string | null>(null);

  const piecesQ = useQuery({
    queryKey: ["studio-pieces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .select(
          "id,title,theme,phase,status,scope,energia,creation_strategy,planned_date,series_name,series_position,updated_at",
        )
        .eq("scope", "profissional")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Piece[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sem sessão");
      const title = `Nova peça ${new Date().toLocaleString("pt-BR")}`;
      const { data, error } = await supabase
        .from("content_pieces")
        .insert({
          user_id: uid,
          title,
          phase: 1,
          status: "ideia",
          scope: "profissional",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["studio-pieces"] });
      setActiveId(id);
      setView("foco");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar a peça");
    },
  });

  const columns = useMemo(() => {
    const items = piecesQ.data ?? [];
    return PHASES.map((p) => ({
      ...p,
      items: items.filter((it) => (it.phase ?? 1) === p.n),
    }));
  }, [piecesQ.data]);

  const activePiece = useMemo(
    () => (piecesQ.data ?? []).find((p) => p.id === activeId) ?? null,
    [piecesQ.data, activeId],
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {view === "biblioteca" ? (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
                  <Clapperboard className="h-7 w-7 text-accent" />
                  Studio
                </h1>
                <p className="text-sm text-muted-foreground mt-1">seu estúdio de conteúdo</p>
              </div>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                <Plus className="h-4 w-4" />
                Nova peça
              </Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4">
              {columns.map((col) => (
                <div key={col.n} className="min-w-[260px] w-[260px] flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-sm font-medium">
                      <span className="text-muted-foreground mr-1.5">{col.n}.</span>
                      {col.label}
                    </h2>
                    <Badge variant="outline" className="text-[10px]">
                      {col.items.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {col.items.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic px-2 py-6 text-center border border-dashed rounded-md">
                        vazio
                      </div>
                    ) : (
                      col.items.map((it) => (
                        <Card
                          key={it.id}
                          onClick={() => {
                            setActiveId(it.id);
                            setView("foco");
                          }}
                          className="p-3 cursor-pointer hover:border-accent transition-colors space-y-2"
                        >
                          <div className="text-sm font-medium line-clamp-2">{it.title ?? "Sem título"}</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {energiaBadge(it.energia)}
                            {it.creation_strategy && (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {it.creation_strategy}
                              </Badge>
                            )}
                            {it.planned_date && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(it.planned_date)}
                              </span>
                            )}
                          </div>
                          {it.series_name && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Film className="h-3 w-3" />
                              <span className="truncate">
                                {it.series_name}
                                {it.series_position ? ` · ep ${it.series_position}` : ""}
                              </span>
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setView("biblioteca");
                setActiveId(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Biblioteca
            </Button>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {activePiece?.title ?? "Carregando..."}
            </h1>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
