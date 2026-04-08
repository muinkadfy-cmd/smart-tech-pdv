import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrintReadinessItem } from "@/features/printing/printing.service";

function getTone(status: PrintReadinessItem["status"]) {
  if (status === "ok") return { icon: CheckCircle2, variant: "success" as const, label: "ok" };
  if (status === "warning") return { icon: CircleAlert, variant: "outline" as const, label: "ajustar" };
  return { icon: CircleDashed, variant: "secondary" as const, label: "pendente" };
}

export function PrintReadinessPanel({ items }: { items: PrintReadinessItem[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Prontidao de impressao</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const tone = getTone(item.status);
          const ToneIcon = tone.icon;
          return (
            <div className="rounded-2xl bg-secondary/45 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
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
