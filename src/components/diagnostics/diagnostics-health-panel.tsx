import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticsHealthItem } from "@/features/diagnostics/diagnostics.service";

export function DiagnosticsHealthPanel({ items }: { items: DiagnosticsHealthItem[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Sinais de saude</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="rounded-2xl bg-secondary/45 p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.value}</p>
              </div>
              <Badge variant={item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : "outline"}>{item.tone}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
