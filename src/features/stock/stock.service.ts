import { getSectorLabel } from "@/features/products/product.service";
import type { OperationFocus, Product, StockAlert, StockCoverageItem, StockMovement } from "@/types/domain";

export function getUnits(product: Product) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function filterProductsByFocus(products: Product[], focus: OperationFocus) {
  return focus === "geral" ? products : products.filter((product) => product.sector === focus);
}

export function buildStockAlerts(products: Product[]): StockAlert[] {
  return products
    .map((product) => {
      const unitsAvailable = getUnits(product);
      const severity = unitsAvailable <= 4 ? "high" : unitsAvailable <= 10 ? "medium" : null;
      if (!severity) {
        return null;
      }

      return {
        id: `alert-${product.id}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        reason: unitsAvailable <= 4 ? "Ruptura proxima" : `Grade curta em ${getSectorLabel(product.sector)}`,
        severity,
        unitsAvailable,
        recommendedUnits: Math.max(12 - unitsAvailable, 4)
      };
    })
    .filter((item): item is StockAlert => item !== null)
    .sort((a, b) => a.unitsAvailable - b.unitsAvailable);
}

export function buildStockCoverage(products: Product[]): StockCoverageItem[] {
  return products
    .map((product) => {
      const unitsAvailable = getUnits(product);
      const dailyVelocity = Math.max(product.sales30d / 30, 0.2);
      return {
        id: product.id,
        productName: product.name,
        category: product.categoryId,
        dailyVelocity,
        coverageDays: Number((unitsAvailable / dailyVelocity).toFixed(1))
      };
    })
    .sort((a, b) => a.coverageDays - b.coverageDays)
    .slice(0, 6);
}

export function summarizeStockMovements(movements: StockMovement[]) {
  return movements.reduce(
    (summary, movement) => {
      if (movement.type === "entrada") summary.entries += movement.quantity;
      if (movement.type === "saida") summary.exits += Math.abs(movement.quantity);
      if (movement.type === "ajuste") summary.adjustments += movement.quantity;
      if (movement.type === "inventario") summary.inventoryChecks += 1;
      return summary;
    },
    { entries: 0, exits: 0, adjustments: 0, inventoryChecks: 0 }
  );
}

export function buildStockSnapshot(products: Product[], movements: StockMovement[]) {
  const totalUnits = products.flatMap((product) => product.variants).reduce((sum, variant) => sum + variant.stock, 0);
  const inventoryValue = products.reduce((sum, product) => sum + product.variants.reduce((acc, variant) => acc + variant.stock * product.costPrice, 0), 0);
  const lowStockCount = products.filter((product) => getUnits(product) <= 10).length;
  const coverage = buildStockCoverage(products);
  const averageCoverage = coverage.length === 0 ? 0 : coverage.reduce((sum, item) => sum + item.coverageDays, 0) / coverage.length;

  return {
    totalUnits,
    lowStockCount,
    inventoryValue,
    stockCoverageDays: Number(averageCoverage.toFixed(1)),
    movements,
    alerts: buildStockAlerts(products),
    coverage
  };
}
