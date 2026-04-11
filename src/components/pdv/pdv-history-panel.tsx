import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PdvHistoryItem } from "@/features/pdv/pdv.service";

export function PdvHistoryPanel({ items }: { items: PdvHistoryItem[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Histórico recente de vendas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="panel-block rounded-[18px] p-3.5" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-slate-50">{item.id}</p>
                <p className="text-[12px] text-slate-400">{item.customerName}</p>
              </div>
              <p className="font-semibold text-slate-50">{item.totalLabel}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-slate-400">
              <span>{item.createdAtLabel}</span>
              <span>{item.paymentLabel}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
