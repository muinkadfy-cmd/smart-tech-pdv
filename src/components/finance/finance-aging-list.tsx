import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceAgingItem } from "@/features/finance/finance.service";

function getFinanceToneLabel(tone: FinanceAgingItem["tone"]) {
  if (tone === "destructive") return "Crítico";
  if (tone === "warning") return "Atenção";
  if (tone === "success") return "Conciliado";
  return "Normal";
}

export function FinanceAgingList({ items }: { items: FinanceAgingItem[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Prioridades financeiras</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="premium-tile rounded-[18px] p-3.5" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-slate-50">{item.title}</p>
                <p className="text-[12px] leading-5 text-slate-400">{item.helper}</p>
              </div>
              <Badge variant={item.tone === "destructive" ? "destructive" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "outline"}>
                {getFinanceToneLabel(item.tone)}
              </Badge>
            </div>
            <p className="mt-2.5 font-display text-[22px] font-semibold text-slate-50">{item.amount}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
