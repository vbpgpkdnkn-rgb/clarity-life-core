import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Brain, Plus, Pencil, Sparkles } from "lucide-react";
import {
  ContentStrategy,
  StrategyScope,
  useContentStrategy,
  useUpsertContentStrategy,
} from "@/hooks/useContentStrategy";

export function StrategyOnboarding({ scope }: { scope: StrategyScope }) {
  const { data: strategy } = useContentStrategy(scope);
  const upsert = useUpsertContentStrategy();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContentStrategy | null>(null);
  const [pillarInput, setPillarInput] = useState("");

  useEffect(() => {
    if (open && strategy) setDraft({ ...strategy });
  }, [open, strategy]);

  const isEmpty =
    !strategy?.niche && !strategy?.icp && !strategy?.offer && !strategy?.tone;

  const save = async () => {
    if (!draft) return;
    await upsert.mutateAsync(draft);
    setOpen(false);
  };

  return (
    <>
      <Card
        className={`p-4 mb-6 border ${isEmpty ? "border-accent/40 bg-accent/5" : "border-border/60"}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Brain className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-base font-semibold">
                Estratégia de conteúdo
              </h3>
              <Badge variant="outline" className="text-[10px] capitalize">
                {scope}
              </Badge>
              {!isEmpty && (
                <Badge className="text-[10px] bg-success/15 text-success border-success/30">
                  configurada
                </Badge>
              )}
            </div>
            {isEmpty ? (
              <p className="text-sm text-muted-foreground mt-1">
                Sem isso, a IA chuta. Responda 7 perguntas e ela passa a sugerir
                como uma especialista do seu nicho.
              </p>
            ) : (
              <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {strategy?.niche && (
                  <div>
                    <span className="text-muted-foreground">Nicho:</span>{" "}
                    {strategy.niche}
                  </div>
                )}
                {strategy?.icp && (
                  <div>
                    <span className="text-muted-foreground">ICP:</span>{" "}
                    {strategy.icp}
                  </div>
                )}
                {strategy?.offer && (
                  <div>
                    <span className="text-muted-foreground">Oferta:</span>{" "}
                    {strategy.offer}
                  </div>
                )}
                {strategy?.tone && (
                  <div>
                    <span className="text-muted-foreground">Tom:</span>{" "}
                    {strategy.tone}
                  </div>
                )}
              </div>
            )}
            {strategy?.pillars && strategy.pillars.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {strategy.pillars.map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant={isEmpty ? "default" : "outline"} onClick={() => setOpen(true)}>
            {isEmpty ? (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Configurar
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </>
            )}
          </Button>
        </div>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              Estratégia de conteúdo · {scope}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Briefing que a IA usa em todo gerador (ideias, roteiros, plano semanal).
            </p>
          </SheetHeader>
          {draft && (
            <div className="space-y-4 mt-6">
              <div>
                <Label>1. Qual é o seu nicho?</Label>
                <Input
                  value={draft.niche ?? ""}
                  onChange={(e) => setDraft({ ...draft, niche: e.target.value })}
                  placeholder="Ex.: psicologia clínica para mulheres adultas"
                />
              </div>
              <div>
                <Label>2. Quem é o cliente ideal (ICP)?</Label>
                <Textarea
                  value={draft.icp ?? ""}
                  onChange={(e) => setDraft({ ...draft, icp: e.target.value })}
                  placeholder="Idade, contexto, dor principal, o que busca"
                  rows={2}
                />
              </div>
              <div>
                <Label>3. Qual é a oferta principal?</Label>
                <Textarea
                  value={draft.offer ?? ""}
                  onChange={(e) => setDraft({ ...draft, offer: e.target.value })}
                  placeholder="Serviço, programa, produto que você vende"
                  rows={2}
                />
              </div>
              <div>
                <Label>4. Tom de voz</Label>
                <Input
                  value={draft.tone ?? ""}
                  onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
                  placeholder="Ex.: direto, acolhedor, científico, provocativo"
                />
              </div>
              <div>
                <Label>5. Pilares de conteúdo (3-5)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={pillarInput}
                    placeholder="Ex.: ansiedade"
                    onChange={(e) => setPillarInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = pillarInput.trim();
                        if (!v) return;
                        setDraft({ ...draft, pillars: [...(draft.pillars ?? []), v] });
                        setPillarInput("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const v = pillarInput.trim();
                      if (!v) return;
                      setDraft({ ...draft, pillars: [...(draft.pillars ?? []), v] });
                      setPillarInput("");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {(draft.pillars ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {draft.pillars.map((p, i) => (
                      <Badge key={i} variant="outline" className="gap-1 pr-1 text-xs">
                        {p}
                        <button
                          onClick={() =>
                            setDraft({
                              ...draft,
                              pillars: draft.pillars.filter((_, idx) => idx !== i),
                            })
                          }
                          className="hover:text-destructive ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>6. Cadência de postagem</Label>
                <Input
                  value={draft.posting_cadence ?? ""}
                  onChange={(e) => setDraft({ ...draft, posting_cadence: e.target.value })}
                  placeholder="Ex.: 4 reels + 3 carrosséis por semana"
                />
              </div>
              <div>
                <Label>7. Objetivo principal nos próximos 90 dias</Label>
                <Textarea
                  value={draft.goals ?? ""}
                  onChange={(e) => setDraft({ ...draft, goals: e.target.value })}
                  placeholder="Ex.: gerar 30 leads/mês para consulta inicial"
                  rows={2}
                />
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs text-muted-foreground">Opcional — afina ainda mais a IA</p>
                <div>
                  <Label>Formato assinatura</Label>
                  <Input
                    value={draft.signature_format ?? ""}
                    onChange={(e) => setDraft({ ...draft, signature_format: e.target.value })}
                    placeholder="Ex.: carrossel didático com 8 slides"
                  />
                </div>
                <div>
                  <Label>Marcas / criadores de referência</Label>
                  <Input
                    value={draft.reference_brands ?? ""}
                    onChange={(e) => setDraft({ ...draft, reference_brands: e.target.value })}
                    placeholder="Quem você admira e quer se inspirar"
                  />
                </div>
                <div>
                  <Label>Temas a evitar</Label>
                  <Input
                    value={draft.forbidden_topics ?? ""}
                    onChange={(e) => setDraft({ ...draft, forbidden_topics: e.target.value })}
                    placeholder="Política, religião, crítica direta…"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={upsert.isPending}>
                  Salvar estratégia
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
