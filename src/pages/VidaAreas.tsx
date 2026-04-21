import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAreaBalance } from "@/hooks/useLifeAreas";

export default function VidaAreas() {
  const { data: areas = [], isLoading } = useAreaBalance();

  return (
    <AppLayout title="Áreas da vida" subtitle="Equilíbrio entre as 10 dimensões">
      <VidaNav />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {areas.map((a: any) => {
          const isNeglected = a.totalActivity === 0;
          return (
            <Card key={a.id} className={`p-4 border-border/60 ${isNeglected ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div
                  className="w-1 self-stretch rounded-full"
                  style={{ background: a.color }}
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="font-medium">{a.name}</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {a.totalActivity} atividades
                    </span>
                  </div>
                  <Progress value={a.score} className="h-1.5 mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{a.doneTasks} tarefas · {a.habitLogs} hábitos</span>
                    {isNeglected && <span className="text-destructive/70">Negligenciada</span>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Score = (tarefas concluídas + hábitos cumpridos) / atividade total nos últimos 14 dias.
        Áreas sem atividade ficam destacadas para você reequilibrar.
      </p>
    </AppLayout>
  );
}
