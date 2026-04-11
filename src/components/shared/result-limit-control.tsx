import { Button } from "@/components/ui/button";

interface ResultLimitControlProps {
  baseCount: number;
  totalCount: number;
  visibleCount: number;
  itemLabel: string;
  onShowMore: () => void;
  onReset: () => void;
}

export function ResultLimitControl({
  baseCount,
  totalCount,
  visibleCount,
  itemLabel,
  onShowMore,
  onReset
}: ResultLimitControlProps) {
  if (totalCount <= baseCount) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm">
      <div className="text-muted-foreground">
        Mostrando <span className="font-semibold text-slate-50">{visibleCount}</span> de{" "}
        <span className="font-semibold text-slate-50">{totalCount}</span> {itemLabel}.
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleCount < totalCount ? (
          <Button onClick={onShowMore} size="sm" variant="outline">
            Mostrar mais
          </Button>
        ) : null}
        {visibleCount > baseCount ? (
          <Button onClick={onReset} size="sm" variant="ghost">
            Recolher
          </Button>
        ) : null}
      </div>
    </div>
  );
}
