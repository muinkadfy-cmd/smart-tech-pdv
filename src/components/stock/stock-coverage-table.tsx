import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Product, StockCoverageItem } from "@/types/domain";

export function StockCoverageTable({ coverage, products = [] }: { coverage: StockCoverageItem[]; products?: Product[] }) {
  const productMap = Object.fromEntries(products.map((product) => [product.name, product]));

  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Cobertura por produto</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Giro diario</TableHead>
              <TableHead>Cobertura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-slate-950">
                  <div className="flex items-center gap-3">
                    <ProductImagePlaceholder
                      compact
                      className="w-[118px]"
                      imageHint={productMap[item.productName]?.imageHint}
                      name={item.productName}
                      sector={productMap[item.productName]?.sector}
                    />
                    <span>{item.productName}</span>
                  </div>
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.dailyVelocity.toFixed(2)}</TableCell>
                <TableCell>{item.coverageDays} dias</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
