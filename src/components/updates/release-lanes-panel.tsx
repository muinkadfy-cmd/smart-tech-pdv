import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReleaseLaneItem } from "@/features/updates/updates.service";

export function ReleaseLanesPanel({ items }: { items: ReleaseLaneItem[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Canais de distribuição</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div className="premium-tile rounded-2xl p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-50">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.audience}</p>
              </div>
              {item.highlighted ? <Badge variant="success">recomendado</Badge> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.helper}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
