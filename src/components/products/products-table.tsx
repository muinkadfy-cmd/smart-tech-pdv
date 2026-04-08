import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { getSectorLabel, getSectorUnitLabel } from "@/features/products/product.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Brand, Category, Product } from "@/types/domain";

interface ProductsTableProps {
  products: Product[];
  brands: Brand[];
  categories: Category[];
}

export function ProductsTable({ products, brands, categories }: ProductsTableProps) {
  const brandMap = Object.fromEntries(brands.map((brand) => [brand.id, brand.name]));
  const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Produto",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <ProductImagePlaceholder compact imageHint={row.original.imageHint} name={row.original.name} sector={row.original.sector} className="w-[124px]" />
          <div className="space-y-1">
            <p className="text-[14px] font-semibold text-slate-950">{row.original.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
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
      header: "Preco",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-950">{formatCurrency(row.original.promotionalPrice ?? row.original.salePrice)}</p>
          {row.original.promotionalPrice ? <p className="text-[11px] text-slate-500 line-through">{formatCurrency(row.original.salePrice)}</p> : null}
        </div>
      )
    },
    {
      id: "stock",
      header: "Estoque",
      cell: ({ row }) => {
        const units = row.original.variants.reduce((sum, variant) => sum + variant.stock, 0);
        return (
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-950">{units} {getSectorUnitLabel(row.original.sector)}</p>
            <p className="text-[11px] text-slate-500">{row.original.variants.map((variant) => `${variant.size}:${variant.stock}`).slice(0, 4).join("  ·  ")}</p>
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
    }
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Card className="border-white/80 bg-white/90">
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
            {table.getRowModel().rows.map((row) => (
              <TableRow className="cursor-default" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
