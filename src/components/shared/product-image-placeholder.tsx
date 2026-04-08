import { Footprints, ScanSearch, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductSector } from "@/types/domain";

interface ProductImagePlaceholderProps {
  name: string;
  imageHint?: string;
  sector?: ProductSector;
  compact?: boolean;
  className?: string;
}

function getVisualConfig(name: string, imageHint?: string, sector?: ProductSector) {
  const signature = `${name} ${imageHint ?? ""}`.toLowerCase();

  if (sector === "calcados" || /tenis|sapato|sandalia|bota|slip/.test(signature)) {
    return {
      icon: Footprints,
      eyebrow: "Calcados",
      gradient: "from-slate-950 via-slate-800 to-sky-500"
    };
  }

  if (/vestido|blusa|look|camisa|saia|jeans|roupa/.test(signature) || sector === "roupas") {
    return {
      icon: Shirt,
      eyebrow: "Roupas",
      gradient: "from-slate-950 via-slate-800 to-emerald-500"
    };
  }

  return {
    icon: ScanSearch,
    eyebrow: "Produto",
    gradient: "from-slate-950 via-slate-800 to-indigo-500"
  };
}

export function ProductImagePlaceholder({ name, imageHint, sector, compact, className }: ProductImagePlaceholderProps) {
  const visual = getVisualConfig(name, imageHint, sector);
  const VisualIcon = visual.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white",
        visual.gradient,
        compact ? "h-14 rounded-xl px-3 py-2.5" : "h-28",
        className
      )}
    >
      <div>
        <p className={cn("uppercase tracking-[0.24em] text-white/70", compact ? "text-[10px]" : "text-[11px]")}>{visual.eyebrow}</p>
        <p className={cn("font-semibold leading-5", compact ? "mt-1 max-w-[8rem] text-[12px]" : "mt-2 max-w-[10rem] text-sm")}>{name}</p>
        {!compact && imageHint ? <p className="mt-2 max-w-[11rem] text-[11px] text-white/72">{imageHint}</p> : null}
      </div>
      <VisualIcon className={cn("shrink-0 text-white/78", compact ? "h-4.5 w-4.5" : "h-6 w-6")} />
    </div>
  );
}
