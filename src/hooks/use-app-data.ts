import { useCallback, useEffect, useMemo, useState, type DependencyList } from "react";
import { appRepository } from "@/repositories/app-repository";
import { recordRuntimeDiagnostic } from "@/services/diagnostics/runtime-diagnostics.service";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const appDataCache = new Map<string, unknown>();

function getCachedData<T>(cacheKey: string) {
  return (appDataCache.get(cacheKey) as T | undefined) ?? null;
}

function createInitialState<T>(cacheKey: string): AsyncState<T> {
  const cachedData = getCachedData<T>(cacheKey);
  return {
    data: cachedData,
    loading: cachedData === null,
    error: null
  };
}

export function useAppData<T>(cacheKey: string, loader: () => Promise<T>, deps: DependencyList = []) {
  const stableLoader = useMemo(() => loader, deps);
  const [state, setState] = useState<AsyncState<T>>(() => createInitialState<T>(cacheKey));
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    appDataCache.delete(cacheKey);
    setRefreshKey((current) => current + 1);
  }, [cacheKey]);

  useEffect(() => {
    let active = true;
    const cachedData = getCachedData<T>(cacheKey);

    setState((current) => ({
      data: current.data ?? cachedData,
      loading: current.data === null && cachedData === null,
      error: null
    }));

    stableLoader()
      .then((data) => {
        if (!active) {
          return;
        }
        appDataCache.set(cacheKey, data);
        setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (!active) {
          return;
        }
        recordRuntimeDiagnostic({
          severity: "error",
          source: "data",
          title: "Falha ao carregar dados do módulo",
          message: error.message,
          detail: `Loader: ${cacheKey}`
        });
        setState((current) => ({
          data: current.data ?? cachedData,
          loading: false,
          error: error.message
        }));
      });

    return () => {
      active = false;
    };
  }, [cacheKey, refreshKey, stableLoader]);

  return {
    ...state,
    reload
  };
}

export function invalidateAppDataCache(cacheKey?: string) {
  if (!cacheKey) {
    appDataCache.clear();
    return;
  }

  appDataCache.delete(cacheKey);
}

export function useDashboardSnapshot() {
  return useAppData("dashboard-snapshot", () => appRepository.getDashboardSnapshot(), []);
}

export function useProducts() {
  return useAppData("products", () => appRepository.getProducts(), []);
}

export function useCategories() {
  return useAppData("categories", () => appRepository.getCategories(), []);
}

export function useBrands() {
  return useAppData("brands", () => appRepository.getBrands(), []);
}

export function useStockSnapshot() {
  return useAppData("stock-snapshot", () => appRepository.getStockSnapshot(), []);
}

export function useOrders() {
  return useAppData("orders", () => appRepository.getOrders(), []);
}

export function useCustomers() {
  return useAppData("customers", () => appRepository.getCustomers(), []);
}

export function useSales() {
  return useAppData("sales", () => appRepository.getSales(), []);
}

export function useSuppliers() {
  return useAppData("suppliers", () => appRepository.getSuppliers(), []);
}

export function usePurchases() {
  return useAppData("purchases", () => appRepository.getPurchases(), []);
}

export function useFinancialEntries() {
  return useAppData("financial-entries", () => appRepository.getFinancialEntries(), []);
}

export function useReportsSnapshot() {
  return useAppData("reports-snapshot", () => appRepository.getReportsSnapshot(), []);
}

export function useSettingsSnapshot() {
  return useAppData("settings-snapshot", () => appRepository.getSettingsSnapshot(), []);
}

export function useDiagnosticsSnapshot() {
  return useAppData("diagnostics-snapshot", () => appRepository.getDiagnosticsSnapshot(), []);
}
