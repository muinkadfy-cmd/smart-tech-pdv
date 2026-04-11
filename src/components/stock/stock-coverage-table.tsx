import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImagePreview } from "@/components/shared/product-image-preview";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Product, StockCoverageItem } from "@/types/domain";

function getCoverageTone(days: number) {
  if (days <= 7) {
    return { label: "Muito curta", variant: "destructive" as const };
  }

  if (days <= 15) {
    return { label: "Monitorar", variant: "warning" as const };
  }

  return { label: "Saudável", variant: "success" as const };
}

export function StockCoverageTable({ coverage, products = [] }: { coverage: StockCoverageItem[]; products?: Product[] }) {
  const productMap = Object.fromEntries(products.map((product) => [product.name, product]));

  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Cobertura por produto</CardTitle>
        <CardDescription>Leitura rápida para ver onde o giro já está apertando o estoque.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {coverage.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Giro diário</TableHead>
                <TableHead>Cobertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coverage.map((item) => {
                const tone = getCoverageTone(item.coverageDays);
                const product = productMap[item.productName];

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-50">
                      <div className="flex items-center gap-3">
                        <ProductImagePreview
                          compact
                          className="w-[118px]"
                          imageDataUrl={product?.imageDataUrl}
                          imageHint={product?.imageHint}
                          modalDescription="Foto real ampliada do produto para conferência rápida de estoque."
                          name={item.productName}
                          sector={product?.sector}
                        />
                        <div>
                          <p className="font-medium text-slate-50">{item.productName}</p>
                          <p className="mt-1 text-xs text-slate-400">Giro médio do recorte atual.</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.dailyVelocity.toFixed(2)} un./dia</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={tone.variant}>{tone.label}</Badge>
                        <span>{item.coverageDays} dias</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4">
            <div className="empty-state-box text-sm">Ainda não há cobertura consolidada para esse recorte.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
