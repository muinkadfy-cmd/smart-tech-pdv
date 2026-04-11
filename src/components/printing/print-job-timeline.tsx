import { Clock3, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrintJobItem } from "@/features/printing/printing.service";
import { formatDate } from "@/lib/utils";

export function PrintJobTimeline({ items }: { items: PrintJobItem[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Fila e histórico rápido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="premium-tile rounded-2xl p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-50">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.format} • {item.status}</p>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDate(item.createdAt)}
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <Printer className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>{item.helper}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
