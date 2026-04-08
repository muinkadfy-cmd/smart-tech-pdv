import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductFormPreviewProps {
  issues: string[];
}

export function ProductFormPreview({ issues }: ProductFormPreviewProps) {
  const healthy = issues.length === 0;

  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Checklist do cadastro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${healthy ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
          {healthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="text-sm font-medium">{healthy ? "Cadastro consistente para avancar" : "Ajuste os campos abaixo antes de salvar"}</span>
        </div>
        {healthy ? (
          <div className="rounded-2xl bg-secondary/45 p-4 text-sm text-muted-foreground">SKU, precificacao e grade estao coerentes no preenchimento atual.</div>
        ) : (
          issues.map((issue) => (
            <div className="rounded-2xl bg-secondary/45 p-4 text-sm text-slate-900" key={issue}>{issue}</div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
