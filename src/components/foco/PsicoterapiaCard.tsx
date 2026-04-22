import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePatients, useTherapySessions, useUpsertTherapySession } from "@/hooks/usePsicoterapia";
import { todayISO } from "@/lib/format";
import {
  Brain,
  Clock,
  ChevronRight,
  FileCheck2,
  CircleDollarSign,
  ListChecks,
} from "lucide-react";

/**
 * Card de Psicoterapia no Foco do Dia.
 * Mostra agenda de hoje + ações rápidas (marcar realizada, marcar prontuário evoluído).
 */
export function PsicoterapiaCard() {
  const navigate = useNavigate();
  const today = todayISO();
  const { data: sessions = [] } = useTherapySessions({ from: today, to: today });
  const { data: patients = [] } = usePatients();
  const upsertSession = useUpsertTherapySession();

  const patientById = useMemo(
    () => Object.fromEntries((patients as any[]).map((p) => [p.id, p])),
    [patients],
  );

  const ordered = (sessions as any[])
    .slice()
    .sort((a, b) => (a.start_time || "99:99").localeCompare(b.start_time || "99:99"));

  if (ordered.length === 0) return null;

  const realizadas = ordered.filter((s) => s.status === "realizada").length;
  const semProntuario = ordered.filter((s) => s.status === "realizada" && !s.chart_updated).length;
  const pendentePag = ordered.filter(
    (s) => s.status === "realizada" && s.payment_status === "pendente",
  ).length;

  return (
    <Card className="p-5 border-border/60 shadow-none mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent" />
          <h3 className="font-display text-base font-semibold">Psicoterapia</h3>
          <Badge variant="outline" className="text-[10px]">
            {realizadas}/{ordered.length} realizadas
          </Badge>
          {semProntuario > 0 && (
            <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
              <FileCheck2 className="h-2.5 w-2.5 mr-0.5" /> {semProntuario} sem prontuário
            </Badge>
          )}
          {pendentePag > 0 && (
            <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
              <CircleDollarSign className="h-2.5 w-2.5 mr-0.5" /> {pendentePag} a receber
            </Badge>
          )}
        </div>
        <button
          onClick={() => navigate("/psicoterapia")}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Abrir módulo <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-1">
        {ordered.map((s) => {
          const p = patientById[s.patient_id];
          const done = s.status === "realizada";
          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/40 transition-colors ${
                s.status === "cancelada" ? "opacity-50" : ""
              }`}
            >
              <span className="text-xs tabular-nums text-muted-foreground w-12">
                <Clock className="h-3 w-3 inline mr-0.5" />
                {s.start_time?.slice(0, 5) || "—"}
              </span>
              <button
                onClick={() => navigate("/psicoterapia")}
                className={`text-sm flex-1 text-left truncate ${done ? "text-muted-foreground" : "font-medium"}`}
              >
                {p?.name ?? "Paciente"}
              </button>
              {done && s.chart_updated && (
                <FileCheck2 className="h-3.5 w-3.5 text-accent" />
              )}
              {done && s.payment_status === "pago" && (
                <CircleDollarSign className="h-3.5 w-3.5 text-success" />
              )}
              {!done && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => upsertSession.mutate({ ...s, status: "realizada" })}
                  title="Marcar como realizada"
                >
                  <ListChecks className="h-3.5 w-3.5" />
                </Button>
              )}
              {done && !s.chart_updated && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-warning"
                  onClick={() => upsertSession.mutate({ ...s, chart_updated: true })}
                  title="Marcar prontuário evoluído"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
