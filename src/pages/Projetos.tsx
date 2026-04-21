import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScopeBadge } from "@/components/ScopeBadge";
import { useProjects, useUpsertProject, useDeleteProject } from "@/hooks/useProjects";
import { useLifeAreas } from "@/hooks/useLifeAreas";
import { useGoals } from "@/hooks/useData";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { Plus, FolderKanban, Trash2, Calendar, Target as TargetIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  planejado: "bg-muted text-muted-foreground",
  em_andamento: "bg-primary/10 text-primary border-primary/20",
  pausado: "bg-warning/10 text-warning border-warning/20",
  concluido: "bg-success/10 text-success border-success/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Projetos() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const { data: projects = [], isLoading } = useProjects();
  const { data: areas = [] } = useLifeAreas();
  const { data: goals = [] } = useGoals();
  const upsert = useUpsertProject();
  const del = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let r = filterByScope(projects, scope);
    if (statusFilter !== "all") r = r.filter((p: any) => p.status === statusFilter);
    return r;
  }, [projects, scope, statusFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { em_andamento: [], planejado: [], pausado: [], concluido: [], cancelado: [] };
    filtered.forEach((p: any) => g[p.status]?.push(p));
    return g;
  }, [filtered]);

  const openNew = () => {
    setEditing({
      name: "",
      description: "",
      vision: "",
      success_criteria: "",
      next_step: "",
      milestones_text: "",
      stakeholders: [],
      risks: [],
      kpis: [],
      budget: null,
      scope: scope === "todos" ? "pessoal" : scope,
      status: "planejado",
      priority: "media",
      area_id: null,
      goal_id: null,
      start_date: "",
      deadline: "",
    });
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing({ ...p });
    setOpen(true);
  };

  const save = async () => {
    if (!editing.name?.trim()) return;
    await upsert.mutateAsync(editing);
    setOpen(false);
  };

  return (
    <AppLayout
      title="Projetos"
      subtitle="Organize iniciativas em camadas — projeto → OKRs → tarefas"
      action={
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo projeto
        </Button>
      }
    >
      {/* Filtro */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "em_andamento", "planejado", "pausado", "concluido"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "Todos" : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center border-border/60 shadow-none">
          <FolderKanban className="h-8 w-8 mx-auto text-accent mb-3" />
          <h2 className="font-display text-xl font-semibold mb-2">Nenhum projeto ainda</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Projetos agrupam tarefas e OKRs em torno de uma iniciativa concreta.
          </p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Criar primeiro projeto</Button>
        </Card>
      )}

      {/* Grid agrupado por status */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-8">
          {(["em_andamento", "planejado", "pausado", "concluido", "cancelado"] as const).map((s) => {
            if (!grouped[s] || grouped[s].length === 0) return null;
            return (
              <div key={s}>
                <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  {STATUS_LABEL[s]} · {grouped[s].length}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped[s].map((p: any) => {
                    const area = areas.find((a: any) => a.id === p.area_id);
                    const goal = goals.find((g: any) => g.id === p.goal_id);
                    return (
                      <Card
                        key={p.id}
                        className="p-4 border-border/60 shadow-none hover:border-accent/40 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/projetos/${p.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-display text-base font-semibold leading-tight flex-1">{p.name}</h4>
                          <ScopeBadge scope={p.scope} />
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap text-[10px] mb-3">
                          {area && (
                            <Badge variant="outline" className="border-border/60">
                              {area.icon} {area.name}
                            </Badge>
                          )}
                          {goal && (
                            <Badge variant="outline" className="border-border/60">
                              <TargetIcon className="h-2.5 w-2.5 mr-1" />
                              {goal.name}
                            </Badge>
                          )}
                          {p.deadline && (
                            <Badge variant="outline" className="border-border/60">
                              <Calendar className="h-2.5 w-2.5 mr-1" />
                              {format(new Date(p.deadline + "T00:00:00"), "dd/MM", { locale: ptBR })}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={Number(p.progress) || 0} className="h-1 flex-1" />
                          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                            {Math.round(Number(p.progress) || 0)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_COLOR[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            className="text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            editar
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              {editing?.id ? "Editar projeto" : "Novo projeto"}
            </SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 mt-6">
              <div>
                <Label>Nome</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
              </div>
              <div>
                <Label>Descrição curta</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Em uma frase, sobre o que é"
                  rows={2}
                />
              </div>
              <div>
                <Label>Visão / por que esse projeto importa</Label>
                <Textarea
                  value={editing.vision ?? ""}
                  onChange={(e) => setEditing({ ...editing, vision: e.target.value })}
                  placeholder="Qual o impacto se entregue? O que muda quando acabar?"
                  rows={3}
                />
              </div>
              <div>
                <Label>Critérios de sucesso</Label>
                <Textarea
                  value={editing.success_criteria ?? ""}
                  onChange={(e) => setEditing({ ...editing, success_criteria: e.target.value })}
                  placeholder="Como você sabe que o projeto deu certo? Liste métricas/observáveis."
                  rows={2}
                />
              </div>
              <div>
                <Label>Próximo passo concreto</Label>
                <Input
                  value={editing.next_step ?? ""}
                  onChange={(e) => setEditing({ ...editing, next_step: e.target.value })}
                  placeholder="Ação única que destrava o projeto agora"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Escopo</Label>
                  <Select value={editing.scope} onValueChange={(v) => setEditing({ ...editing, scope: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Progresso (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editing.progress ?? 0}
                    onChange={(e) => setEditing({ ...editing, progress: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Área da vida</Label>
                <Select
                  value={editing.area_id ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, area_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {areas.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.icon} {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meta vinculada</Label>
                <Select
                  value={editing.goal_id ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, goal_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {goals.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={editing.start_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={editing.deadline ?? ""}
                    onChange={(e) => setEditing({ ...editing, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Orçamento (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editing.budget ?? ""}
                    onChange={(e) => setEditing({ ...editing, budget: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Stakeholders */}
              <ListField
                label="Stakeholders / pessoas envolvidas"
                placeholder="Ex.: cliente X, sócio Y"
                items={editing.stakeholders ?? []}
                onChange={(arr) => setEditing({ ...editing, stakeholders: arr })}
              />

              {/* Riscos */}
              <ListField
                label="Riscos / o que pode dar errado"
                placeholder="Ex.: prazo apertado, dependência externa"
                items={editing.risks ?? []}
                onChange={(arr) => setEditing({ ...editing, risks: arr })}
              />

              {/* KPIs */}
              <ListField
                label="KPIs / indicadores que importam"
                placeholder="Ex.: 1000 leads, NPS 70"
                items={editing.kpis ?? []}
                onChange={(arr) => setEditing({ ...editing, kpis: arr })}
              />

              <div>
                <Label>Marcos / fases</Label>
                <Textarea
                  value={editing.milestones_text ?? ""}
                  onChange={(e) => setEditing({ ...editing, milestones_text: e.target.value })}
                  placeholder="Liste 3-5 entregas-chave em ordem"
                  rows={3}
                />
              </div>
              <div className="flex justify-between gap-2 pt-4 border-t border-border">
                {editing.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Excluir projeto?")) {
                        await del.mutateAsync(editing.id);
                        setOpen(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={save}>Salvar</Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function ListField({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (arr: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...(items ?? []), v]);
    setDraft("");
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {(items ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map((it: string, i: number) => (
            <Badge key={i} variant="outline" className="text-xs gap-1 pr-1">
              {it}
              <button
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="ml-1 hover:text-destructive"
                aria-label="remover"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
