import { create } from "zustand";
import { defaultProductFilters } from "@/features/products/product.service";
import type { ProductFilters } from "@/types/domain";

interface ProductCatalogState {
  filters: ProductFilters;
  advancedFiltersOpen: boolean;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  toggleAdvancedFilters: () => void;
}

export const useProductCatalogStore = create<ProductCatalogState>((set) => ({
  filters: defaultProductFilters,
  advancedFiltersOpen: false,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultProductFilters }),
  toggleAdvancedFilters: () => set((state) => ({ advancedFiltersOpen: !state.advancedFiltersOpen }))
}));
