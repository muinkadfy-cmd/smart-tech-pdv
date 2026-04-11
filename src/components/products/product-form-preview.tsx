import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductSector } from "@/types/domain";

interface ProductFormPreviewProps {
  issues: string[];
  imageDataUrl?: string;
  imageHint: string;
  name: string;
  sector: ProductSector;
}

export function ProductFormPreview({ issues, imageDataUrl, imageHint, name, sector }: ProductFormPreviewProps) {
  const uniqueIssues = Array.from(new Set(issues));
  const healthy = uniqueIssues.length === 0;

  return (
    <Card className="surface-rule executive-panel">
      <CardHeader>
        <CardTitle>Checklist do cadastro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ProductImagePlaceholder
          className="h-40"
          imageDataUrl={imageDataUrl}
          imageHint={imageHint}
          name={name || "Novo produto"}
          sector={sector}
        />
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${healthy ? "border border-emerald-400/18 bg-[rgba(22,58,42,0.78)] text-emerald-100" : "border border-amber-300/18 bg-[rgba(74,50,18,0.78)] text-amber-100"}`}>
          {healthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="text-sm font-medium">{healthy ? "Cadastro consistente para avançar" : "Ajuste os campos abaixo antes de salvar"}</span>
        </div>
        <div className="theme-preview-card space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Leitura do cadastro</p>
          <div className="grid gap-2 text-[13px] text-slate-300">
            <p><span className="font-semibold text-slate-50">Produto:</span> {name || "Novo produto sem nome final"}</p>
            <p><span className="font-semibold text-slate-50">Setor:</span> {sector === "calcados" ? "Calçados" : "Roupas"}</p>
            <p><span className="font-semibold text-slate-50">Visual:</span> {imageDataUrl ? "Foto própria pronta para lista, PDV e estoque" : imageHint}</p>
          </div>
        </div>
        {healthy ? (
          <div className="premium-tile rounded-2xl p-4 text-sm text-muted-foreground">SKU, precificação e grade estão coerentes no preenchimento atual.</div>
        ) : (
          uniqueIssues.map((issue, index) => (
            <div className="premium-tile rounded-2xl p-4 text-sm text-slate-50" key={`${issue}-${index}`}>{issue}</div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
