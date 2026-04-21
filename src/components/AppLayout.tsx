import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { formatDateLong } from "@/lib/format";

export function AppLayout({ children, title, subtitle, action }: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10 px-4">
            <SidebarTrigger />
            <div className="text-xs text-muted-foreground capitalize hidden sm:block">
              {formatDateLong(new Date())}
            </div>
            <div className="ml-auto">{action}</div>
          </header>
          <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10 max-w-7xl w-full mx-auto animate-fade-in">
            {title && (
              <div className="mb-8">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
                {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
