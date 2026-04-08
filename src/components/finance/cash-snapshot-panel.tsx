import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CashSnapshot } from "@/features/finance/finance.service";

export function CashSnapshotPanel({ snapshot }: { snapshot: CashSnapshot }) {
  return (
    <Card className="surface-rule border-white/80 bg-white/92">
      <CardHeader>
        <CardTitle>Caixa projetado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[22px] bg-slate-950 p-4 text-white">
          <p className="text-[12px] uppercase tracking-[0.16em] text-slate-300">Saldo projetado</p>
          <p className="mt-2 font-display text-[30px] font-semibold">{snapshot.projectedCash}</p>
          <p className="mt-2 text-[13px] text-sky-200">{snapshot.warningLabel}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-3.5">
            <p className="text-[12px] uppercase tracking-[0.14em] text-slate-500">Recebimentos previstos</p>
            <p className="mt-2 font-semibold text-slate-950">{snapshot.openReceivables}</p>
          </div>
          <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-3.5">
            <p className="text-[12px] uppercase tracking-[0.14em] text-slate-500">Pagamentos previstos</p>
            <p className="mt-2 font-semibold text-slate-950">{snapshot.openPayables}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
