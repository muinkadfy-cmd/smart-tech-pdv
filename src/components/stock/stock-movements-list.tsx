import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { Product, StockMovement } from "@/types/domain";

interface StockMovementsListProps {
  products: Product[];
  movements: StockMovement[];
}

export function StockMovementsList({ products, movements }: StockMovementsListProps) {
  const productMap = Object.fromEntries(products.map((product) => [product.id, product]));

  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Movimentacoes recentes</CardTitle>
        <CardDescription>Historico objetivo para auditoria de estoque e conferencia.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProductImagePlaceholder
                      compact
                      className="w-[118px]"
                      imageHint={productMap[movement.productId]?.imageHint}
                      name={productMap[movement.productId]?.name ?? movement.productId}
                      sector={productMap[movement.productId]?.sector}
                    />
                    <span>{productMap[movement.productId]?.name ?? movement.productId}</span>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{movement.type}</TableCell>
                <TableCell>{movement.quantity}</TableCell>
                <TableCell>{movement.reason}</TableCell>
                <TableCell>{formatDate(movement.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
