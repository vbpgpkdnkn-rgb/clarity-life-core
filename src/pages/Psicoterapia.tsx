import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePatients, useTherapySessions, useUpsertTherapySession } from "@/hooks/usePsicoterapia";
import { PatientFormDrawer } from "@/components/psicoterapia/PatientFormDrawer";
import { SessionFormDrawer } from "@/components/psicoterapia/SessionFormDrawer";
import { PatientsCSVImport } from "@/components/psicoterapia/PatientsCSVImport";
import { AgendaImportDrawer } from "@/components/psicoterapia/AgendaImportDrawer";
import { SessionAnalysisDrawer } from "@/components/psicoterapia/SessionAnalysisDrawer";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { todayISO, addDaysISO, formatDateLong } from "@/lib/format";
import {
  Plus,
  Users,
  Calendar as CalIcon,
  FileCheck2,
  Clock,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Search,
  ImageUp,
  Brain,
  ListPlus,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  falta: "Falta",
};

const STATUS_COLOR: Record<string, string> = {
  agendada: "bg-muted text-muted-foreground",
  realizada: "bg-success/15 text-success border-success/30",
  cancelada: "bg-muted text-muted-foreground line-through",
  falta: "bg-destructive/10 text-destructive border-destructive/30",
};


export default function Psicoterapia() {
  const [date, setDate] = useState(todayISO());
  const { data: patients = [] } = usePatients();
  const { data: dayAll = [] } = useTherapySessions({ from: date, to: date });
  const { data: monthAll = [] } = useTherapySessions({
    from: addDaysISO(date, -30),
    to: addDaysISO(date, 30),
  });
  const upsertSession = useUpsertTherapySession();

  const [patientOpen, setPatientOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [sessionPatientId, setSessionPatientId] = useState<string | undefined>();
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskPatientId, setTaskPatientId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [agendaImportOpen, setAgendaImportOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisPatient, setAnalysisPatient] = useState<{ id: string; name: string } | null>(null);

  const patientById = useMemo(
    () => Object.fromEntries((patients as any[]).map((p) => [p.id, p])),
    [patients],
  );

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (patients as any[]).filter((p) => p.status !== "encerrado");
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q),
    );
  }, [patients, search]);

  const todaySessions = (dayAll as any[]).slice().sort((a, b) =>
    (a.start_time || "99:99").localeCompare(b.start_time || "99:99"),
  );

  // Métricas rápidas do dia (sem dados financeiros — vivem só em Financeiro PJ)
  const dayStats = useMemo(() => {
    const total = todaySessions.length;
    const realizadas = todaySessions.filter((s) => s.status === "realizada").length;
    const evoluido = todaySessions.filter((s) => s.chart_updated).length;
    return { total, realizadas, evoluido };
  }, [todaySessions]);

  // Sessões da próxima semana (visão da agenda)
  const upcoming = useMemo(() => {
    return (monthAll as any[])
      .filter((s) => s.date >= date && s.date <= addDaysISO(date, 7) && s.status !== "cancelada")
      .sort((a, b) => (a.date + (a.start_time || "")).localeCompare(b.date + (b.start_time || "")));
  }, [monthAll, date]);

  const openSession = (s: any) => {
    setEditingSession(s);
    setSessionPatientId(undefined);
    setSessionOpen(true);
  };
  const newSession = (patientId?: string) => {
    setEditingSession(null);
    setSessionPatientId(patientId);
    setSessionOpen(true);
  };
  const openPatient = (p: any) => {
    setEditingPatient(p);
    setPatientOpen(true);
  };
  const newPatient = () => {
    setEditingPatient(null);
    setPatientOpen(true);
  };

  const toggleChart = (s: any) => {
    upsertSession.mutate({ ...s, chart_updated: !s.chart_updated });
  };

  const markRealizada = (s: any) => {
    upsertSession.mutate({ ...s, status: "realizada" });
  };

  const newTaskForPatient = (patientId?: string) => {
    setTaskPatientId(patientId);
    setTaskOpen(true);
  };

  const openAnalysis = (patientId: string) => {
    const p = patientById[patientId];
    setAnalysisPatient({ id: patientId, name: p?.name ?? "Paciente" });
    setAnalysisOpen(true);
  };

  return (
    <AppLayout
      title="Psicoterapia"
      subtitle={formatDateLong(date)}
      action={
        <div className="flex gap-1 items-center">
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(todayISO())}>
            Hoje
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAgendaImportOpen(true)} className="ml-2">
            <ImageUp className="h-4 w-4 mr-1" /> Importar foto
          </Button>
          <Button size="sm" onClick={() => newSession()} className="ml-1">
            <Plus className="h-4 w-4 mr-1" /> Sessão
          </Button>
        </div>
      }
    >
      {/* Resumo do dia (clínico — financeiro vive em Financeiro PJ) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat icon={<CalIcon className="h-4 w-4" />} label="Sessões hoje" value={String(dayStats.total)} />
        <Stat icon={<ListChecks className="h-4 w-4" />} label="Realizadas" value={`${dayStats.realizadas}/${dayStats.total}`} />
        <Stat
          icon={<FileCheck2 className="h-4 w-4" />}
          label="Prontuário ok"
          value={`${dayStats.evoluido}/${dayStats.realizadas}`}
          warning={dayStats.realizadas > 0 && dayStats.evoluido < dayStats.realizadas}
        />
      </div>

      <Tabs defaultValue="agenda" className="w-full">
        <TabsList>
          <TabsTrigger value="agenda">
            <CalIcon className="h-4 w-4 mr-1" /> Agenda
          </TabsTrigger>
          <TabsTrigger value="pacientes">
            <Users className="h-4 w-4 mr-1" /> Pacientes
          </TabsTrigger>
        </TabsList>

        {/* AGENDA */}
        <TabsContent value="agenda" className="space-y-4 mt-4">
          <Card className="p-5 border-border/60 shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Sessões do dia</h2>
              <Button size="sm" variant="outline" onClick={() => newSession()}>
                <Plus className="h-4 w-4 mr-1" /> Nova sessão
              </Button>
            </div>
            {todaySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma sessão agendada para este dia.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {todaySessions.map((s) => {
                  const p = patientById[s.patient_id];
                  return (
                    <div key={s.id} className="py-2.5 flex items-center gap-3">
                      <div className="text-xs tabular-nums text-muted-foreground w-16 shrink-0">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {s.start_time?.slice(0, 5) || "—"}
                      </div>
                      <button
                        onClick={() => openSession(s)}
                        className="font-medium text-sm hover:text-accent text-left flex-1 min-w-0 truncate"
                      >
                        {p?.name ?? "Paciente"}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openAnalysis(s.patient_id)}
                          title="Assistente de IA — analisar sessão"
                          className="text-accent hover:text-accent"
                        >
                          <Brain className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleChart(s)}
                          title={s.chart_updated ? "Prontuário evoluído (clique para desmarcar)" : "Marcar prontuário evoluído"}
                          className={s.chart_updated ? "text-success" : ""}
                        >
                          <FileCheck2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => newTaskForPatient(s.patient_id)}
                          title="Criar tarefa para este paciente"
                        >
                          <ListPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5 border-border/60 shadow-none">
            <h2 className="font-display text-lg font-semibold mb-4">Próximos 7 dias</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem sessões marcadas.</p>
            ) : (
              <div className="space-y-1">
                {upcoming.map((s) => {
                  const p = patientById[s.patient_id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => openSession(s)}
                      className="w-full flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/40 text-left"
                    >
                      <span className="text-xs tabular-nums text-muted-foreground w-24">
                        {new Date(s.date + "T00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" })}
                      </span>
                      <span className="text-xs tabular-nums w-12 text-muted-foreground">
                        {s.start_time?.slice(0, 5) || "—"}
                      </span>
                      <span className="text-sm flex-1 truncate">{p?.name ?? "Paciente"}</span>
                      {s.chart_updated && (
                        <FileCheck2 className="h-3.5 w-3.5 text-success shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* PACIENTES */}
        <TabsContent value="pacientes" className="space-y-4 mt-4">
          <Card className="p-5 border-border/60 shadow-none">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-display text-lg font-semibold">Pacientes</h2>
              <div className="flex items-center gap-2">
                <PatientsCSVImport />
                <Button size="sm" onClick={newPatient}>
                  <Plus className="h-4 w-4 mr-1" /> Novo
                </Button>
              </div>
            </div>
            <div className="relative mb-4">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar paciente"
                className="pl-9"
              />
            </div>
            {filteredPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum paciente cadastrado. Importe um CSV ou adicione manualmente.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {filteredPatients.map((p) => {
                  const sessionsOfPatient = (monthAll as any[]).filter((s) => s.patient_id === p.id);
                  const lastSession = sessionsOfPatient
                    .filter((s) => s.status === "realizada")
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  return (
                    <div key={p.id} className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openPatient(p)}
                          className="font-medium text-sm hover:text-accent text-left"
                        >
                          {p.name}
                        </button>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                          {p.phone && <span>{p.phone}</span>}
                          {p.email && <span>{p.email}</span>}
                          {lastSession && (
                            <span>
                              Última:{" "}
                              {new Date(lastSession.date + "T00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPatient(p)}
                        title="Editar paciente"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => newSession(p.id)}
                        title="Nova sessão"
                      >
                        <CalIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => newTaskForPatient(p.id)}
                        title="Nova tarefa"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <PatientFormDrawer
        open={patientOpen}
        onOpenChange={setPatientOpen}
        patient={editingPatient}
      />
      <SessionFormDrawer
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        session={editingSession}
        defaultDate={date}
      />
      <TaskFormDrawer
        open={taskOpen}
        onOpenChange={(v) => {
          setTaskOpen(v);
          if (!v) setTaskPatientId(undefined);
        }}
        task={taskPatientId ? { patient_id: taskPatientId, scope: "profissional" } : null}
        defaultDate={date}
      />
      <AgendaImportDrawer open={agendaImportOpen} onOpenChange={setAgendaImportOpen} />
      {analysisPatient && (
        <SessionAnalysisDrawer
          open={analysisOpen}
          onOpenChange={(v) => {
            setAnalysisOpen(v);
            if (!v) setAnalysisPatient(null);
          }}
          patientId={analysisPatient.id}
          patientName={analysisPatient.name}
          kind="single"
        />
      )}
    </AppLayout>
  );
}

function Stat({
  icon,
  label,
  value,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <Card className={`p-3 border-border/60 shadow-none ${warning ? "border-warning/40 bg-warning/5" : ""}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-display text-xl font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}
