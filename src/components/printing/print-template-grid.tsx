import { Check, CircleAlert, Printer, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PrintTemplateItem } from "@/features/printing/printing.service";
import { cn } from "@/lib/utils";

function getToneLabel(status: PrintTemplateItem["readiness"]) {
  if (status === "ok") return { label: "pronto", icon: Check, className: "text-emerald-700" };
  if (status === "warning") return { label: "ajustar", icon: CircleAlert, className: "text-amber-700" };
  return { label: "pendente", icon: CircleAlert, className: "text-slate-500" };
}

export function PrintTemplateGrid({
  items,
  activeId,
  onSelect,
  onPrint
}: {
  items: PrintTemplateItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onPrint: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const tone = getToneLabel(item.readiness);
        const ToneIcon = tone.icon;
        const isActive = activeId === item.id;
        return (
          <Card className={cn("border-white/80 bg-white/90 transition", isActive && "ring-2 ring-primary/25")} key={item.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.format} • {item.density}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {item.isPreferred ? <Badge variant="secondary">padrao</Badge> : null}
                  <Badge variant={item.readiness === "ok" ? "success" : item.readiness === "warning" ? "outline" : "secondary"}>
                    <ToneIcon className={cn("h-3.5 w-3.5", tone.className)} />
                    {tone.label}
                  </Badge>
                </div>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>

              <div className="rounded-2xl bg-secondary/45 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-950">Dispositivo sugerido</p>
                <p className="mt-1">{item.recommendedDevice}</p>
                <p className="mt-2 text-muted-foreground">{item.helper}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onSelect(item.id)} variant={isActive ? "default" : "outline"}>
                  <Tags className="h-4 w-4" />
                  {isActive ? "Em preview" : "Ver preview"}
                </Button>
                <Button onClick={() => onPrint(item.id)} variant="outline">
                  <Printer className="h-4 w-4" />
                  Testar impressao
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
