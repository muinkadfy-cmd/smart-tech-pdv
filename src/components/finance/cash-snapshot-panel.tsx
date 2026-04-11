import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CashSnapshot } from "@/features/finance/finance.service";

export function CashSnapshotPanel({ snapshot }: { snapshot: CashSnapshot }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Caixa projetado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[22px] border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(180deg,rgba(18,21,28,0.98),rgba(12,15,22,1))] p-4 text-white shadow-[0_24px_34px_-26px_rgba(0,0,0,0.6)]">
          <p className="text-[12px] uppercase tracking-[0.16em] text-slate-300">Saldo projetado</p>
          <p className="mt-2 font-display text-[30px] font-semibold">{snapshot.projectedCash}</p>
          <p className="mt-2 text-[13px] text-sky-200">{snapshot.warningLabel}. Use esse radar para decidir cobrança, pagamento e priorização do dia.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="premium-tile rounded-[18px] p-3.5">
            <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Recebimentos previstos</p>
            <p className="mt-2 font-semibold text-slate-50">{snapshot.openReceivables}</p>
          </div>
          <div className="premium-tile rounded-[18px] p-3.5">
            <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Pagamentos previstos</p>
            <p className="mt-2 font-semibold text-slate-50">{snapshot.openPayables}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
