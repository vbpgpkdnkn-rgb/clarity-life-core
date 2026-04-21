import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScopeProvider } from "@/contexts/ScopeContext";
import Foco from "./pages/Foco";
import Dashboard from "./pages/Dashboard";
import Tarefas from "./pages/Tarefas";
import PlannerDiario from "./pages/PlannerDiario";
import PlannerSemanal from "./pages/PlannerSemanal";
import PlannerRevisao from "./pages/PlannerRevisao";
import PlannerHabitos from "./pages/PlannerHabitos";
import PlannerNotas from "./pages/PlannerNotas";
import Metas from "./pages/Metas";
import MetaDetalhe from "./pages/MetaDetalhe";
import Financeiro from "./pages/Financeiro";
import VisaoAnual from "./pages/VisaoAnual";
import Conteudo from "./pages/Conteudo";
import Vida from "./pages/Vida";
import VidaAreas from "./pages/VidaAreas";
import VidaDreamboard from "./pages/VidaDreamboard";
import VidaGratidao from "./pages/VidaGratidao";
import VidaBrainDump from "./pages/VidaBrainDump";
import VidaCheckin from "./pages/VidaCheckin";
import VidaRefeicoes from "./pages/VidaRefeicoes";
import VidaLimpeza from "./pages/VidaLimpeza";
import VidaDesejos from "./pages/VidaDesejos";
import VidaLivros from "./pages/VidaLivros";
import VidaDesafios from "./pages/VidaDesafios";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ScopeProvider>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Foco />} />
          <Route path="/visao-geral" element={<Dashboard />} />
          <Route path="/planner" element={<PlannerDiario />} />
          <Route path="/planner/semanal" element={<PlannerSemanal />} />
          <Route path="/planner/revisao" element={<PlannerRevisao />} />
          <Route path="/planner/habitos" element={<PlannerHabitos />} />
          <Route path="/planner/notas" element={<PlannerNotas />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/projetos/:id" element={<ProjetoDetalhe />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/metas/:id" element={<MetaDetalhe />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/anual" element={<VisaoAnual />} />
          <Route path="/conteudo" element={<Conteudo />} />
          <Route path="/vida" element={<Vida />} />
          <Route path="/vida/areas" element={<VidaAreas />} />
          <Route path="/vida/dreamboard" element={<VidaDreamboard />} />
          <Route path="/vida/gratidao" element={<VidaGratidao />} />
          <Route path="/vida/brain-dump" element={<VidaBrainDump />} />
          <Route path="/vida/checkin" element={<VidaCheckin />} />
          <Route path="/vida/refeicoes" element={<VidaRefeicoes />} />
          <Route path="/vida/limpeza" element={<VidaLimpeza />} />
          <Route path="/vida/desejos" element={<VidaDesejos />} />
          <Route path="/vida/livros" element={<VidaLivros />} />
          <Route path="/vida/desafios" element={<VidaDesafios />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ScopeProvider>
  </QueryClientProvider>
);

export default App;
