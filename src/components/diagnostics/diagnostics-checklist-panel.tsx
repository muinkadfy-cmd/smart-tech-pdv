import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticsChecklistItem } from "@/features/diagnostics/diagnostics.service";

export function DiagnosticsChecklistPanel({ items }: { items: DiagnosticsChecklistItem[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Checklist tecnico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="rounded-2xl bg-secondary/45 p-4" key={item.id}>
            <p className="font-semibold text-slate-950">{item.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
