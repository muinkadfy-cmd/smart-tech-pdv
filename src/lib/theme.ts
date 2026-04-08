export const APP_THEME_OPTIONS = ["Windows Contrast"] as const;

export type AppThemeName = (typeof APP_THEME_OPTIONS)[number];

export function normalizeAppTheme(theme?: string | null): AppThemeName {
  return "Windows Contrast";
}

export function getThemeDatasetValue(theme?: string | null) {
  const normalizedTheme = normalizeAppTheme(theme);
  return normalizedTheme === "Windows Contrast" ? "windows-contrast" : "windows-contrast";
}

export function applyAppTheme(theme?: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  const datasetTheme = getThemeDatasetValue(theme);
  document.documentElement.dataset.theme = datasetTheme;
  document.body.dataset.theme = datasetTheme;
}
