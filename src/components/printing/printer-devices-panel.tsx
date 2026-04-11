import { CheckCircle2, HardDrive, Printer, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrinterDeviceItem } from "@/features/printing/printing.service";

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("pronta") || normalized.includes("configurada") || normalized.includes("preview")) {
    return { variant: "success" as const, icon: CheckCircle2 };
  }
  if (normalized.includes("ajustar") || normalized.includes("configurar")) {
    return { variant: "outline" as const, icon: TriangleAlert };
  }
  return { variant: "secondary" as const, icon: HardDrive };
}

export function PrinterDevicesPanel({
  items,
  onSetDefault,
  onPrint
}: {
  items: PrinterDeviceItem[];
  onSetDefault?: (item: PrinterDeviceItem) => void;
  onPrint?: (item: PrinterDeviceItem) => void;
}) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Centro de dispositivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const badge = getStatusBadge(item.status);
          const StatusIcon = badge.icon;
          return (
            <div className="premium-tile rounded-2xl p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-slate-400" />
                    <p className="font-semibold text-slate-50">{item.name}</p>
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
                <div className="space-y-1">
                  <span className="block">{item.helper}</span>
                  <span className="block text-[11px] uppercase tracking-[0.16em] text-[color:rgba(214,190,142,0.72)]">{item.printFlowLabel}</span>
                </div>
                <div className="flex items-center gap-2 self-start">
                  {onPrint ? (
                    <Button onClick={() => onPrint(item)} size="sm" variant="outline">
                      Testar impressão
                    </Button>
                  ) : null}
                  {item.isDefault ? <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">padrão do fluxo</span> : null}
                  {!item.isDefault && onSetDefault && (item.type === "58 mm" || item.type === "80 mm") ? (
                    <Button onClick={() => onSetDefault(item)} size="sm" variant="outline">
                      Definir padrão
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
