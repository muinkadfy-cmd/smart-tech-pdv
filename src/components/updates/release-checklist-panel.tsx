import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReleaseChecklistItem } from "@/features/updates/updates.service";

function getTone(status: ReleaseChecklistItem["status"]) {
  if (status === "ok") return { icon: CheckCircle2, variant: "success" as const, label: "Pronto" };
  if (status === "warning") return { icon: CircleAlert, variant: "outline" as const, label: "Atenção" };
  return { icon: CircleDashed, variant: "secondary" as const, label: "Pendente" };
}

export function ReleaseChecklistPanel({ items }: { items: ReleaseChecklistItem[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Checklist de release</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const tone = getTone(item.status);
          const ToneIcon = tone.icon;
          return (
            <div className="premium-tile rounded-2xl p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-50">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
                </div>
                <Badge variant={tone.variant}>
                  <ToneIcon className="h-3.5 w-3.5" />
                  {tone.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
