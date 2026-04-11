import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReleaseArtifactItem } from "@/features/updates/updates.service";

function getTone(status: ReleaseArtifactItem["status"]) {
  if (status === "ok") return { icon: CheckCircle2, variant: "success" as const, label: "Pronto" };
  if (status === "warning") return { icon: CircleAlert, variant: "outline" as const, label: "Ajustar" };
  return { icon: CircleDashed, variant: "secondary" as const, label: "Pendente" };
}

export function ReleaseArtifactsPanel({ items }: { items: ReleaseArtifactItem[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Artefatos esperados</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const tone = getTone(item.status);
          const ToneIcon = tone.icon;
          return (
            <div className="premium-tile rounded-2xl p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-50">{item.title}</p>
                <Badge variant={tone.variant}>
                  <ToneIcon className="h-3.5 w-3.5" />
                  {tone.label}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
