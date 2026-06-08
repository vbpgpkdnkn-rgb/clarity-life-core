import { useState } from "react";
import { LayoutDashboard, CalendarDays, Target, Wallet, ListTodo, CalendarRange, Clapperboard, Heart, FolderKanban, LogOut, ArrowUpDown, ChevronUp, ChevronDown, RotateCcw, Check, Brain, BookOpen, Repeat2, ClipboardCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useRecentAdjustments } from "@/hooks/useAdaptive";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useSidebarOrder } from "@/hooks/useSidebarOrder";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Hoje", url: "/", icon: CalendarDays, end: true },
  { title: "Foco", url: "/foco", icon: Target },
  { title: "Planner", url: "/planner", icon: CalendarDays },
  { title: "Visão geral", url: "/visao-geral", icon: LayoutDashboard },
  { title: "Tarefas", url: "/tarefas", icon: ListTodo },
  { title: "Projetos", url: "/projetos", icon: FolderKanban },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Conteúdo", url: "/conteudo", icon: Clapperboard },
  { title: "Psicoterapia", url: "/psicoterapia", icon: Brain },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Vida", url: "/vida", icon: Heart },
  { title: "Livros", url: "/vida/livros", icon: BookOpen },
  { title: "Hábitos", url: "/planner/habitos", icon: Repeat2 },
  { title: "Check-in", url: "/vida/checkin", icon: ClipboardCheck },
  { title: "Anual", url: "/anual", icon: CalendarRange },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const adjustmentsQ = useRecentAdjustments();
  const pendingCount = (adjustmentsQ.data ?? []).filter((a) => a.status === "sugerido").length;
  const [editMode, setEditMode] = useState(false);
  const { orderedItems, move, reset } = useSidebarOrder(items);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <div className="px-4 pt-6 pb-4">
          {!collapsed ? (
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-foreground">
                Life<span className="text-accent">OS</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">Sua vida, organizada</p>
            </div>
          ) : (
            <div className="font-display text-2xl font-semibold text-accent text-center">L</div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-2">
            <span>Navegação</span>
            {!collapsed && (
              <button
                onClick={() => setEditMode((v) => !v)}
                className={`p-1 rounded hover:bg-sidebar-accent transition-colors ${editMode ? "text-accent" : "text-muted-foreground"}`}
                title={editMode ? "Concluir reordenação" : "Reordenar módulos"}
              >
                {editMode ? <Check className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {editMode && !collapsed && (
              <div className="px-2 pb-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Use ↑↓ para reordenar</span>
                <button
                  onClick={reset}
                  className="text-[10px] text-muted-foreground hover:text-accent flex items-center gap-1"
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Restaurar
                </button>
              </div>
            )}
            <SidebarMenu>
              {orderedItems.map((item, idx) => {
                const active = item.end
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                const showBadge = item.url === "/" && pendingCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <div className="flex items-center gap-1">
                      <SidebarMenuButton asChild className="h-11 flex-1">
                        <NavLink
                          to={item.url}
                          end={item.end}
                          className="flex items-center gap-3 rounded-md transition-colors hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <div className="relative">
                            <item.icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
                            {showBadge && collapsed && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent" />
                            )}
                          </div>
                          {!collapsed && (
                            <span className="text-sm flex-1 flex items-center justify-between gap-2">
                              {item.title}
                              {showBadge && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground tabular-nums">
                                  {pendingCount}
                                </span>
                              )}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                      {editMode && !collapsed && (
                        <div className="flex flex-col pr-1">
                          <button
                            onClick={() => move(item.url, "up")}
                            disabled={idx === 0}
                            className="p-0.5 text-muted-foreground hover:text-accent disabled:opacity-20"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => move(item.url, "down")}
                            disabled={idx === orderedItems.length - 1}
                            className="p-0.5 text-muted-foreground hover:text-accent disabled:opacity-20"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            title={user?.email ?? "Sair"}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="truncate text-xs">{user?.email ?? "Sair"}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
