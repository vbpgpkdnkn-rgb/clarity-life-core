import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const OPERATIONAL_TABLES = [
  "focus_sessions",
  "habit_logs",
  "daily_checkins",
  "daily_plans",
  "weekly_plans",
  "weekly_reviews",
  "brain_dump_items",
  "gratitude_entries",
  "free_notes",
  "meal_plans",
  "cleaning_logs",
  "challenge_logs",
  "ai_insights",
  "performance_adjustments",
  "session_analyses",
  "agenda_imports",
  "bank_statement_entries",
  "tasks",
  "events",
  "transactions",
] as const;

const TOTAL_EXTRA_TABLES = [
  "content_project_stages",
  "content_project_versions",
  "content_project_locks",
  "content_projects",
  "content_pieces",
  "content_ideas",
  "content_stories",
  "content_story_sequences",
  "content_references",
  "content_strategy",
  "editorial_lines",
  "idea_refinement_chats",
  "audience_analyses",
  "strategic_scripts",
  "instagram_snapshots",
  "content_metrics",
  "book_notes",
  "books",
  "wishlist_items",
  "dreamboard_items",
  "life_areas",
  "challenges",
  "cleaning_tasks",
  "project_okrs",
  "projects",
  "milestones",
  "goals",
  "therapy_sessions",
  "patients",
  "recurrences",
  "accounts",
] as const;

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

async function purgeTables(tables: readonly string[]) {
  for (const table of tables) {
    const { error } = await supabase.from(table as any).delete().neq("id", NIL_UUID);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

const TOTAL_DELETE_ORDER: { table: string; key: string }[] = [
  "focus_sessions","habit_logs","daily_checkins","daily_plans","weekly_plans","weekly_reviews",
  "brain_dump_items","gratitude_entries","free_notes","meal_plans","cleaning_logs","challenge_logs",
  "ai_insights","performance_adjustments","session_analyses","agenda_imports","bank_statement_entries",
  "tasks","events","transactions","content_project_stages","content_project_versions",
  "content_project_locks","content_projects","content_pieces","content_ideas","content_stories",
  "content_story_sequences","content_references","content_strategy","editorial_lines",
  "idea_refinement_chats","audience_analyses","strategic_scripts","instagram_snapshots",
  "content_metrics","book_notes","books","wishlist_items","dreamboard_items","life_areas",
  "challenges","cleaning_tasks","project_okrs","projects","milestones","goals","therapy_sessions",
  "patients","recurrences","accounts",
].map((t) => ({ table: t, key: t === "content_project_locks" ? "project_id" : "id" }));

async function deleteAll() {
  for (const { table, key } of TOTAL_DELETE_ORDER) {
    const { error } = await supabase.from(table as any).delete().neq(key, NIL_UUID);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const [opOpen, setOpOpen] = useState(false);
  const [totalOpen, setTotalOpen] = useState(false);
  const [opConfirm, setOpConfirm] = useState("");
  const [totalConfirm, setTotalConfirm] = useState("");
  const [opLoading, setOpLoading] = useState(false);
  const [totalLoading, setTotalLoading] = useState(false);

  const runOperational = async () => {
    setOpLoading(true);
    try {
      await purgeTables(OPERATIONAL_TABLES);
      queryClient.clear();
      toast.success("Dados limpos. Você começa do zero agora.");
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao limpar dados");
      setOpLoading(false);
    }
  };

  const runTotal = async () => {
    setTotalLoading(true);
    try {
      await deleteAll();
      queryClient.clear();
      toast.success("Tudo zerado. Bem-vinda ao começo.");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao zerar tudo");
      setTotalLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-3xl py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Configurações</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-muted-foreground">Dados e Reset</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Limpar dados do dia a dia</CardTitle>
              <CardDescription>
                Remove tarefas, anotações, hábitos, check-ins, planos, sessões de foco, transações e registros de
                planejamento. Mantém seus pacientes, metas, projetos de conteúdo e contas financeiras intactos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-warning text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() => {
                  setOpConfirm("");
                  setOpOpen(true);
                }}
              >
                Limpar dados operacionais
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Zerar tudo e começar do zero</CardTitle>
              <CardDescription>
                Remove absolutamente todos os dados que você inseriu: tarefas, metas, pacientes, projetos de conteúdo,
                transações, hábitos, anotações e muito mais. O app volta ao estado inicial de instalação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setTotalConfirm("");
                  setTotalOpen(true);
                }}
              >
                Zerar tudo
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <AlertDialog open={opOpen} onOpenChange={(o) => !opLoading && setOpOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai remover permanentemente seus dados operacionais. Pacientes, metas e projetos de conteúdo serão
              preservados. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Digite <span className="font-mono font-semibold text-foreground">LIMPAR</span> para confirmar:
            </p>
            <Input
              value={opConfirm}
              onChange={(e) => setOpConfirm(e.target.value)}
              placeholder="LIMPAR"
              disabled={opLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={opLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runOperational();
              }}
              disabled={opConfirm !== "LIMPAR" || opLoading}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {opLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={totalOpen} onOpenChange={(o) => !totalLoading && setTotalOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção: isso apaga tudo</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os seus dados serão removidos permanentemente. Essa ação não pode ser desfeita. Para confirmar,
              digite: ZERAR TUDO
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Digite <span className="font-mono font-semibold text-foreground">ZERAR TUDO</span> para confirmar:
            </p>
            <Input
              value={totalConfirm}
              onChange={(e) => setTotalConfirm(e.target.value)}
              placeholder="ZERAR TUDO"
              disabled={totalLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={totalLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runTotal();
              }}
              disabled={totalConfirm !== "ZERAR TUDO" || totalLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {totalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
