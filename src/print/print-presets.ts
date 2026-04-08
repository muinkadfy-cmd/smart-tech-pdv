/** Larguras e presets para térmica 58mm, 80mm e A4 (recibo/etiqueta). */
export const PRINT_WIDTH_MM = {
  thermal58: 58,
  thermal80: 80,
  a4WidthMm: 210
} as const;

export type PrintKind = "receipt" | "label";

export interface PrintJobDraft {
  kind: PrintKind;
  widthMm: number;
  htmlOrEscPos: string;
  silent?: boolean;
}
