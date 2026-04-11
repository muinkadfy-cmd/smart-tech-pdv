import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { getSectorLabel, getSectorUnitLabel } from "@/features/products/product.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePreview } from "@/components/shared/product-image-preview";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Brand, Category, Product } from "@/types/domain";

interface ProductsTableProps {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  canManageCatalog?: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}

export function ProductsTable({ products, brands, categories, canManageCatalog = true, onEdit, onToggleStatus }: ProductsTableProps) {
  const brandMap = Object.fromEntries(brands.map((brand) => [brand.id, brand.name]));
  const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Produto",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <ProductImagePreview compact className="w-[124px]" imageDataUrl={row.original.imageDataUrl} imageHint={row.original.imageHint} modalDescription="Foto real ampliada do produto para leitura comercial do catálogo." name={row.original.name} sector={row.original.sector} />
          <div className="space-y-1">
            <p className="text-[14px] font-semibold text-slate-50">{row.original.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
              <span>{row.original.sku}</span>
              <span>•</span>
              <span>{row.original.internalCode}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      accessorKey: "sector",
      header: "Setor",
      cell: ({ row }) => <Badge variant="outline">{getSectorLabel(row.original.sector)}</Badge>
    },
    {
      accessorKey: "categoryId",
      header: "Categoria",
      cell: ({ row }) => categoryMap[row.original.categoryId] ?? row.original.categoryId
    },
    {
      accessorKey: "brandId",
      header: "Marca",
      cell: ({ row }) => brandMap[row.original.brandId] ?? row.original.brandId
    },
    {
      accessorKey: "salePrice",
      header: "Preço",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-50">{formatCurrency(row.original.promotionalPrice ?? row.original.salePrice)}</p>
          {row.original.promotionalPrice ? <p className="text-[11px] text-slate-400 line-through">{formatCurrency(row.original.salePrice)}</p> : null}
        </div>
      )
    },
    {
      id: "stock",
      header: "Saldo",
      cell: ({ row }) => {
        const units = row.original.variants.reduce((sum, variant) => sum + variant.stock, 0);
        return (
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-50">{units} {getSectorUnitLabel(row.original.sector)}</p>
            <p className="text-[11px] text-slate-400">{row.original.variants.map((variant) => `${variant.size}:${variant.stock}`).slice(0, 4).join("  ·  ")}</p>
          </div>
        );
      }
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "success" : "outline"}>
          {row.original.status === "active" ? "Ativo" : "Inativo"}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        canManageCatalog ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onEdit(row.original)} size="sm" variant="outline">
              Editar
            </Button>
            <Button onClick={() => onToggleStatus(row.original)} size="sm" variant="outline">
              {row.original.status === "active" ? "Inativar" : "Reativar"}
            </Button>
          </div>
        ) : (
          <Badge variant="secondary">Somente leitura</Badge>
        )
      )
    }
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Card className="surface-rule overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
              <TableRow className="cursor-default" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell className="py-10 text-center text-sm text-slate-400" colSpan={columns.length}>
                  Nenhum produto encontrado com esse recorte. Revise filtros, status ou setor para continuar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
