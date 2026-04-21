import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sparkles, Plus, TrendingUp, TrendingDown, Minus, Users, Eye, MessageCircle,
  CalendarCheck, Target, Trash2, AlertTriangle, Rocket, Lightbulb,
} from "lucide-react";
import {
  useInstagramSnapshots, useUpsertSnapshot, useDeleteSnapshot,
  useGrowthStrategy, InstagramSnapshot,
} from "@/hooks/useInstagram";
import { useScope } from "@/contexts/ScopeContext";
import { startOfWeekFor, formatWeekRange } from "@/lib/week";
import { todayISO, formatDateBR } from "@/lib/format";
import { useContentPieces, useContentMetrics } from "@/hooks/useContent";

export function GrowthTab() {
  const { scope } = useScope();
  const effectiveScope = scope === "todos" ? "profissional" : scope;
  const { data: snapshots = [] } = useInstagramSnapshots(effectiveScope as any);
  const { data: pieces = [] } = useContentPieces();
  const { data: metrics = [] } = useContentMetrics();
  const strategy = useGrowthStrategy();
  const [editing, setEditing] = useState<Partial<InstagramSnapshot> | null>(null);

  const sorted = useMemo(() => [...snapshots].sort((a, b) => a.week_start.localeCompare(b.week_start)), [snapshots]);
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  const followersDelta = last && prev ? last.followers - prev.followers : 0;
  const followersDeltaPct = last && prev && prev.followers > 0
    ? ((last.followers - prev.followers) / prev.followers) * 100
    : 0;

  const last4 = sorted.slice(-4);
  const totalDms4w = last4.reduce((s, x) => s + (x.dms_received || 0), 0);
  const totalAppts4w = last4.reduce((s, x) => s + (x.appointments_booked || 0), 0);
  const totalReach4w = last4.reduce((s, x) => s + (x.reach || 0), 0);

  const piecesScoped = pieces.filter((p) => p.scope === effectiveScope);
  const captationPosts = piecesScoped.filter((p: any) => (p.generated_dms || 0) > 0 || p.booked_appointment);

  const runStrategy = () => {
    if (snapshots.length < 2) {
      strategy.mutate({
        scope: effectiveScope as any,
        snapshots: snapshots,
        pieces: piecesScoped,
        metrics,
      });
      return;
    }
    strategy.mutate({
      scope: effectiveScope as any,
      snapshots,
      pieces: piecesScoped,
      metrics,
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Seguidores"
          value={last?.followers ?? 0}
          delta={followersDelta}
          deltaPct={followersDeltaPct}
        />
        <KpiCard
          icon={<Eye className="h-4 w-4" />}
          label="Alcance 4 sem."
          value={totalReach4w}
        />
        <KpiCard
          icon={<MessageCircle className="h-4 w-4" />}
          label="DMs 4 sem."
          value={totalDms4w}
          highlight={totalDms4w > 0 ? "primary" : undefined}
        />
        <KpiCard
          icon={<CalendarCheck className="h-4 w-4" />}
          label="Agendamentos 4 sem."
          value={totalAppts4w}
          highlight={totalAppts4w > 0 ? "success" : undefined}
        />
      </div>

      {/* IA estratégica */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-accent" />
              <h3 className="font-display font-semibold">Estratégia de crescimento</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              IA analisa snapshots + posts + captação e diz onde focar.
            </p>
          </div>
          <Button onClick={runStrategy} disabled={strategy.isPending || snapshots.length === 0} size="sm">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {strategy.isPending ? "Analisando…" : "Gerar estratégia"}
          </Button>
        </div>

        {snapshots.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Cadastre o primeiro snapshot semanal para a IA poder analisar.
          </p>
        )}

        {strategy.data && (
          <div className="space-y-4 border-t border-border pt-3">
            {/* Diagnóstico */}
            <div className="rounded-md bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className={`text-[10px] ${PHASE_COLOR[strategy.data.strategy.diagnosis.growth_phase]}`}>
                  {strategy.data.strategy.diagnosis.growth_phase}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Captação: {strategy.data.strategy.diagnosis.acquisition_health}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {strategy.data.strategy.diagnosis.growth_rate_weekly_pct.toFixed(1)}%/sem
                </Badge>
              </div>
              <p className="text-sm">{strategy.data.strategy.diagnosis.summary}</p>
            </div>

            {/* Foco da semana */}
            <div className="rounded-md bg-accent/5 border border-accent/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
                <Target className="h-3 w-3" /> Foco da próxima semana
              </div>
              <p className="text-sm font-medium">{strategy.data.strategy.next_week_focus}</p>
            </div>

            {/* Alavancas crescimento */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Alavancas de crescimento
              </div>
              <div className="space-y-1.5">
                {strategy.data.strategy.growth_levers.map((g, i) => (
                  <div key={i} className="border border-border rounded p-2 text-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="text-[10px]">{g.theme}</Badge>
                      <Badge variant="outline" className="text-[10px]">{g.format}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${IMPACT_COLOR[g.expected_impact]}`}>
                        {g.expected_impact}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{g.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alavancas captação */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <CalendarCheck className="h-3 w-3" /> Alavancas de captação de pacientes
              </div>
              <div className="space-y-1.5">
                {strategy.data.strategy.acquisition_levers.map((a, i) => (
                  <div key={i} className="border border-border rounded p-2 text-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="text-[10px] bg-success/15 text-success border-success/30">
                        CTA: {a.cta_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{a.theme}</Badge>
                    </div>
                    <p className="text-xs mt-1.5 italic">"{a.example_hook}"</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequência */}
            <div className="rounded-md border border-border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Frequência ideal
              </div>
              <div className="flex gap-3 text-sm">
                <span><strong>{strategy.data.strategy.ideal_frequency.posts_per_week}</strong> posts/semana</span>
                <span><strong>{strategy.data.strategy.ideal_frequency.stories_per_day}</strong> stories/dia</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{strategy.data.strategy.ideal_frequency.rationale}</p>
            </div>

            {/* Avisos */}
            {strategy.data.strategy.warnings.length > 0 && (
              <div className="rounded-md bg-warning/5 border border-warning/30 p-3">
                <div className="text-[10px] uppercase tracking-widest text-warning mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Riscos detectados
                </div>
                <ul className="space-y-1 text-sm">
                  {strategy.data.strategy.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">{w.kind}</Badge>
                      <span className="text-xs">{w.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Posts que captaram */}
      {captationPosts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="h-4 w-4 text-success" />
            <h3 className="font-display font-semibold">Posts que captaram</h3>
          </div>
          <div className="space-y-2">
            {captationPosts.slice(0, 8).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border border-border rounded p-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{p.format}</Badge>
                    {p.cta_type && <Badge className="text-[10px]">{p.cta_type}</Badge>}
                  </div>
                </div>
                <div className="flex gap-3 text-xs shrink-0 ml-2">
                  {p.generated_dms > 0 && (
                    <span className="flex items-center gap-1 text-primary">
                      <MessageCircle className="h-3 w-3" /> {p.generated_dms}
                    </span>
                  )}
                  {p.booked_appointment && (
                    <span className="flex items-center gap-1 text-success">
                      <CalendarCheck className="h-3 w-3" /> 1
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Snapshots */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-display font-semibold">Snapshots semanais</h3>
            <p className="text-xs text-muted-foreground">
              Cole as métricas do Instagram toda segunda. A IA usa esse histórico.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditing({
              week_start: startOfWeekFor(todayISO()),
              scope: effectiveScope as any,
            })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo snapshot
          </Button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhum snapshot ainda. Cadastre o primeiro para começar.
          </p>
        ) : (
          <div className="space-y-1.5">
            {[...sorted].reverse().map((s) => (
              <button
                key={s.id}
                onClick={() => setEditing(s)}
                className="w-full text-left flex items-center gap-3 border border-border rounded p-2 hover:border-primary/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground w-32 shrink-0">{formatWeekRange(s.week_start)}</div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <span><strong>{s.followers}</strong> seg.</span>
                  <span className="text-muted-foreground">+{s.followers_gained}</span>
                  <span className="text-muted-foreground">{s.reach.toLocaleString("pt-BR")} alcance</span>
                  <span className="text-muted-foreground">{s.dms_received} dm</span>
                  <span className="text-muted-foreground">{s.appointments_booked} agend.</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <SnapshotDrawer
          snapshot={editing}
          onClose={() => setEditing(null)}
          scope={effectiveScope as any}
        />
      )}
    </div>
  );
}

const PHASE_COLOR: Record<string, string> = {
  estagnada: "bg-muted text-muted-foreground",
  lenta: "bg-warning/15 text-warning border-warning/30",
  saudavel: "bg-success/15 text-success border-success/30",
  acelerada: "bg-primary/15 text-primary border-primary/30",
};
const IMPACT_COLOR: Record<string, string> = {
  alto: "bg-success/15 text-success border-success/30",
  medio: "bg-warning/15 text-warning border-warning/30",
  baixo: "bg-muted text-muted-foreground",
};

function KpiCard({
  icon, label, value, delta, deltaPct, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  delta?: number;
  deltaPct?: number;
  highlight?: "primary" | "success";
}) {
  const trendIcon = delta === undefined ? null : delta > 0
    ? <TrendingUp className="h-3 w-3 text-success" />
    : delta < 0 ? <TrendingDown className="h-3 w-3 text-destructive" />
    : <Minus className="h-3 w-3 text-muted-foreground" />;

  const valueClass = highlight === "primary" ? "text-primary"
    : highlight === "success" ? "text-success"
    : "";

  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className={`text-2xl font-display font-semibold ${valueClass}`}>
        {value.toLocaleString("pt-BR")}
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1 text-xs mt-0.5">
          {trendIcon}
          <span className={delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"}>
            {delta > 0 ? "+" : ""}{delta} ({(deltaPct ?? 0).toFixed(1)}%)
          </span>
        </div>
      )}
    </Card>
  );
}

function SnapshotDrawer({
  snapshot, onClose, scope,
}: {
  snapshot: Partial<InstagramSnapshot>;
  onClose: () => void;
  scope: "pessoal" | "profissional";
}) {
  const upsert = useUpsertSnapshot();
  const del = useDeleteSnapshot();
  const [form, setForm] = useState({
    id: snapshot.id,
    week_start: snapshot.week_start ?? startOfWeekFor(todayISO()),
    followers: String(snapshot.followers ?? ""),
    followers_gained: String(snapshot.followers_gained ?? ""),
    followers_lost: String(snapshot.followers_lost ?? ""),
    reach: String(snapshot.reach ?? ""),
    impressions: String(snapshot.impressions ?? ""),
    profile_visits: String(snapshot.profile_visits ?? ""),
    website_clicks: String(snapshot.website_clicks ?? ""),
    dms_received: String(snapshot.dms_received ?? ""),
    appointments_booked: String(snapshot.appointments_booked ?? ""),
    notes: snapshot.notes ?? "",
  });

  const save = () => {
    upsert.mutate(
      {
        id: form.id,
        scope,
        week_start: form.week_start,
        followers: Number(form.followers) || 0,
        followers_gained: Number(form.followers_gained) || 0,
        followers_lost: Number(form.followers_lost) || 0,
        reach: Number(form.reach) || 0,
        impressions: Number(form.impressions) || 0,
        profile_visits: Number(form.profile_visits) || 0,
        website_clicks: Number(form.website_clicks) || 0,
        dms_received: Number(form.dms_received) || 0,
        appointments_booked: Number(form.appointments_booked) || 0,
        notes: form.notes || null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>{snapshot.id ? "Editar snapshot" : "Novo snapshot semanal"}</DrawerTitle>
          <DrawerDescription>
            Onde achar: Instagram → Profissional → Insights. Período: 7 dias.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto space-y-3">
          <div>
            <Label>Semana iniciando em</Label>
            <Input
              type="date"
              value={form.week_start}
              onChange={(e) => setForm({ ...form, week_start: startOfWeekFor(e.target.value) })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Será ajustada para a segunda-feira da semana.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Seguidores totais" value={form.followers} onChange={(v) => setForm({ ...form, followers: v })} />
            <Field label="Ganhos" value={form.followers_gained} onChange={(v) => setForm({ ...form, followers_gained: v })} hint="auto se vazio" />
            <Field label="Perdidos" value={form.followers_lost} onChange={(v) => setForm({ ...form, followers_lost: v })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Alcance" value={form.reach} onChange={(v) => setForm({ ...form, reach: v })} />
            <Field label="Impressões" value={form.impressions} onChange={(v) => setForm({ ...form, impressions: v })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Visitas ao perfil" value={form.profile_visits} onChange={(v) => setForm({ ...form, profile_visits: v })} />
            <Field label="Cliques no link" value={form.website_clicks} onChange={(v) => setForm({ ...form, website_clicks: v })} />
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Captação</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="DMs recebidas" value={form.dms_received} onChange={(v) => setForm({ ...form, dms_received: v })} />
              <Field label="Agendamentos via IG" value={form.appointments_booked} onChange={(v) => setForm({ ...form, appointments_booked: v })} />
            </div>
          </div>

          <div>
            <Label>Anotações da semana</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="O que aconteceu? Algum post viralizou? Algum insight?"
            />
          </div>
        </div>
        <DrawerFooter className="flex-row gap-2">
          {form.id && (
            <Button variant="ghost" className="text-destructive" onClick={() => { del.mutate(form.id!); onClose(); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function Field({
  label, value, onChange, hint,
}: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
