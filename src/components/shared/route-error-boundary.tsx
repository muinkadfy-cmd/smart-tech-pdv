import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RouteErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

class RouteErrorBoundaryInner extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RouteErrorBoundary] Falha ao renderizar rota", error, errorInfo);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Card className="border-white/80 bg-white/95 shadow-card">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="font-display text-2xl font-semibold text-slate-950">Essa tela encontrou um erro</p>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    A navegação principal continua protegida. Você pode recarregar esta rota ou voltar para o painel sem derrubar o sistema inteiro.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => this.setState({ hasError: false })} type="button">
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
                <Link to="/dashboard">
                  <Button type="button" variant="outline">Voltar ao painel</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundaryInner {...props} />;
}
