import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAreaBalance } from "@/hooks/useLifeAreas";
import { Compass, Heart, Brain, Sparkles, Utensils, Sparkle, Gift, BookOpen, Trophy, ClipboardCheck } from "lucide-react";

const sections = [
  { to: "/vida/areas", label: "Áreas da vida", desc: "Equilíbrio entre as 10 áreas", icon: Compass },
  { to: "/vida/dreamboard", label: "Dreamboard", desc: "Visualização dos seus sonhos", icon: Sparkles },
  { to: "/vida/gratidao", label: "Gratidão", desc: "Registro diário de gratidão", icon: Heart },
  { to: "/vida/brain-dump", label: "Brain dump", desc: "Esvazie a cabeça, organize depois", icon: Brain },
  { to: "/vida/checkin", label: "Check-in emocional", desc: "Humor, energia, sono", icon: ClipboardCheck },
  { to: "/vida/refeicoes", label: "Refeições", desc: "Plano semanal + lista de compras", icon: Utensils },
  { to: "/vida/limpeza", label: "Limpeza", desc: "Rotina por frequência", icon: Sparkle },
  { to: "/vida/desejos", label: "Lista de desejos", desc: "Compras, experiências, viagens", icon: Gift },
  { to: "/vida/livros", label: "Livros", desc: "Leituras + book reviews", icon: BookOpen },
  { to: "/vida/desafios", label: "Desafios", desc: "30 dias com check-in diário", icon: Trophy },
];

export default function Vida() {
  const { data: areas = [] } = useAreaBalance();
  const totalActive = areas.filter((a: any) => a.totalActivity > 0).length;
  const avgScore = areas.length ? Math.round(areas.reduce((s: number, a: any) => s + a.score, 0) / areas.length) : 0;

  return (
    <AppLayout title="Vida" subtitle="O painel completo da sua existência integrada">
      <VidaNav />

      <Card className="p-5 mb-6 border-border/60">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Áreas ativas</p>
            <p className="font-display text-3xl font-semibold mt-1">{totalActive}<span className="text-base text-muted-foreground">/10</span></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Equilíbrio médio</p>
            <p className="font-display text-3xl font-semibold mt-1">{avgScore}<span className="text-base text-muted-foreground">%</span></p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Distribuição (últimos 14 dias)</p>
            <div className="flex gap-1 h-6 rounded overflow-hidden">
              {areas.map((a: any) => (
                <div
                  key={a.id}
                  className="flex-1 transition-all hover:opacity-80"
                  title={`${a.name}: ${a.totalActivity} atividades`}
                  style={{ background: a.color, opacity: a.totalActivity > 0 ? 1 : 0.15 }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card className="p-4 hover:border-accent transition-colors h-full border-border/60">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <s.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{s.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
