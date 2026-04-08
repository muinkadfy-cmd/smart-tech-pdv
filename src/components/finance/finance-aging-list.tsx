import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceAgingItem } from "@/features/finance/finance.service";

export function FinanceAgingList({ items }: { items: FinanceAgingItem[] }) {
  return (
    <Card className="surface-rule border-white/80 bg-white/92">
      <CardHeader>
        <CardTitle>Prioridades financeiras</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-3.5" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-slate-950">{item.title}</p>
                <p className="text-[12px] leading-5 text-slate-600">{item.helper}</p>
              </div>
              <Badge variant={item.tone === "destructive" ? "destructive" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "outline"}>{item.tone}</Badge>
            </div>
            <p className="mt-2.5 font-display text-[22px] font-semibold text-slate-950">{item.amount}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
