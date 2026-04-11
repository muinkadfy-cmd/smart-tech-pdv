import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticsCommandGuideItem } from "@/features/diagnostics/diagnostics.service";

export function DiagnosticsCommandGuidePanel({ items }: { items: DiagnosticsCommandGuideItem[] }) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Verificações externas obrigatórias</CardTitle>
        <p className="text-sm text-slate-400">Tipagem e warnings de build não nascem do runtime. Estes comandos continuam sendo a blindagem para pegar falha antes de venda ou release.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-4" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-50">{item.title}</p>
                <p className="mt-2 text-sm text-slate-400">{item.helper}</p>
              </div>
              <Badge variant={item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : "outline"}>{item.tone === "success" ? "obrigatório" : item.tone === "warning" ? "pré-release" : "manual"}</Badge>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100">{item.command}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
