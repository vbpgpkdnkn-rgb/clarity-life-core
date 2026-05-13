import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  /** Nome amigável do módulo, exibido no fallback */
  scope?: string;
  /** Reinicia automaticamente o boundary quando a rota/estágio muda */
  resetKey?: string | number | null;
  /** Render alternativo de fallback */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log contextualizado — fica visível no console e nas ferramentas de debug
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}]`, error, info?.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);

    return (
      <div className="p-4">
        <Card className="p-5 border-destructive/40 bg-destructive/5 max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold">
              {this.props.scope ? `Falha em ${this.props.scope}` : "Algo quebrou aqui"}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            O restante da aplicação continua funcionando. Você pode tentar recarregar este módulo
            ou voltar e tentar novamente.
          </p>
          <pre className="text-[11px] font-mono bg-background/60 border rounded p-2 overflow-auto max-h-40">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={this.reset}>
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}
