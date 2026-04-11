import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRuntimeLevelLabel, getRuntimeSourceLabel } from "@/features/diagnostics/diagnostics.service";
import { formatDate } from "@/lib/utils";
import type { DiagnosticsRuntimeEntry } from "@/types/domain";

export function DiagnosticsRuntimeEventsPanel({ events }: { events: DiagnosticsRuntimeEntry[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Eventos capturados no runtime</CardTitle>
        <p className="text-sm text-slate-400">Os registros abaixo ajudam a enxergar falhas reais que passaram pelo uso da interface.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-4" key={event.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={event.severity === "error" ? "destructive" : event.severity === "warning" ? "warning" : "outline"}>{getRuntimeLevelLabel(event.severity)}</Badge>
                    <Badge variant="outline">{getRuntimeSourceLabel(event.source)}</Badge>
                    {event.count > 1 ? <Badge variant="outline">{event.count}x repetido</Badge> : null}
                  </div>
                  <p className="font-semibold text-slate-50">{event.title}</p>
                </div>
                <p className="text-[12px] text-slate-400">{formatDate(event.lastSeenAt)}</p>
              </div>
              <p className="mt-3 text-sm text-slate-300">{event.message}</p>
              {event.detail ? <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950/70 px-4 py-3 text-xs text-slate-300 whitespace-pre-wrap">{event.detail}</pre> : null}
            </div>
          ))
        ) : (
          <div className="empty-state-box text-sm">Ainda não houve erro, warning ou falha capturada desde a ativação do monitor local.</div>
        )}
      </CardContent>
    </Card>
  );
}
