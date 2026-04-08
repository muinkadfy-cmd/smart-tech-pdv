import { CheckCircle2, HardDrive, Printer, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrinterDeviceItem } from "@/features/printing/printing.service";

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("pronta")) {
    return { variant: "success" as const, icon: CheckCircle2 };
  }
  if (normalized.includes("ajustar") || normalized.includes("configurar")) {
    return { variant: "outline" as const, icon: TriangleAlert };
  }
  return { variant: "secondary" as const, icon: HardDrive };
}

export function PrinterDevicesPanel({ items }: { items: PrinterDeviceItem[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Centro de dispositivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const badge = getStatusBadge(item.status);
          const StatusIcon = badge.icon;
          return (
            <div className="rounded-2xl bg-secondary/45 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-slate-600" />
                    <p className="font-semibold text-slate-950">{item.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.type} • {item.role}
                  </p>
                </div>
                <Badge variant={badge.variant}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {item.status}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{item.helper}</span>
                {item.isDefault ? <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">padrao do fluxo</span> : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
