import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticsChecklistItem } from "@/features/diagnostics/diagnostics.service";

export function DiagnosticsChecklistPanel({ items }: { items: DiagnosticsChecklistItem[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Checklist técnico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="premium-tile rounded-2xl p-4" key={item.id}>
            <p className="font-semibold text-slate-50">{item.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
