import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScopeProvider } from "@/contexts/ScopeContext";
import Dashboard from "./pages/Dashboard";
import Tarefas from "./pages/Tarefas";
import PlannerDiario from "./pages/PlannerDiario";
import PlannerSemanal from "./pages/PlannerSemanal";
import PlannerRevisao from "./pages/PlannerRevisao";
import PlannerHabitos from "./pages/PlannerHabitos";
import PlannerNotas from "./pages/PlannerNotas";
import Metas from "./pages/Metas";
import Financeiro from "./pages/Financeiro";
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/planner" element={<PlannerDiario />} />
          <Route path="/planner/semanal" element={<PlannerSemanal />} />
          <Route path="/planner/revisao" element={<PlannerRevisao />} />
          <Route path="/planner/habitos" element={<PlannerHabitos />} />
          <Route path="/planner/notas" element={<PlannerNotas />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ScopeProvider>
  </QueryClientProvider>
);

export default App;
