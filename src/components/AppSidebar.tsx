import { Sparkles, LayoutDashboard, CalendarDays, Target, Wallet, ListTodo, CalendarRange, Clapperboard, Heart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  { title: "Foco do dia", url: "/", icon: Sparkles, end: true },
  { title: "Visão geral", url: "/visao-geral", icon: LayoutDashboard },
  { title: "Tarefas", url: "/tarefas", icon: ListTodo },
  { title: "Planner", url: "/planner", icon: CalendarDays },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Conteúdo", url: "/conteudo", icon: Clapperboard },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Vida", url: "/vida", icon: Heart },
  { title: "Anual", url: "/anual", icon: CalendarRange },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.end
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-11">
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className="flex items-center gap-3 rounded-md transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
