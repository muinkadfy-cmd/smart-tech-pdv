import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Smart Tech PDV</p>
        <h1 className="font-display text-5xl font-semibold text-slate-950">Tela não encontrada</h1>
        <p className="max-w-xl text-muted-foreground">
          A rota solicitada não existe no shell principal. Volte ao painel para retomar a operação.
        </p>
      </div>
      <Link className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card" to="/dashboard">
        Voltar ao painel
      </Link>
    </div>
  );
}
