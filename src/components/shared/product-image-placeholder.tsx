import { Footprints, ScanSearch, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import { isProductImageDataUrl } from "@/features/products/product-image";
import type { ProductSector } from "@/types/domain";

interface ProductImagePlaceholderProps {
  name: string;
  imageHint?: string;
  imageDataUrl?: string;
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

export function ProductImagePlaceholder({ name, imageHint, imageDataUrl, sector, compact, className }: ProductImagePlaceholderProps) {
  const visual = getVisualConfig(name, imageHint, sector);
  const VisualIcon = visual.icon;
  const hasUploadedImage = isProductImageDataUrl(imageDataUrl);

  return (
    <div
      className={cn(
        "relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white",
        !hasUploadedImage && visual.gradient,
        compact ? "h-14 rounded-xl px-3 py-2.5" : "h-28",
        className
      )}
    >
      {hasUploadedImage ? (
        <>
          <img alt={name} className="absolute inset-0 h-full w-full object-cover" src={imageDataUrl} />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/58 via-slate-900/20 to-sky-600/12" />
        </>
      ) : null}
      <div className="relative z-10">
        <p className={cn("uppercase tracking-[0.24em]", hasUploadedImage ? "text-white/82" : "text-white/70", compact ? "text-[10px]" : "text-[11px]")}>{visual.eyebrow}</p>
        <p className={cn("font-semibold leading-5", compact ? "mt-1 max-w-[8rem] text-[12px]" : "mt-2 max-w-[10rem] text-sm")}>{name}</p>
        {!compact && imageHint ? <p className={cn("mt-2 max-w-[11rem] text-[11px]", hasUploadedImage ? "text-white/82" : "text-white/72")}>{imageHint}</p> : null}
      </div>
      <VisualIcon className={cn("relative z-10 shrink-0", hasUploadedImage ? "text-white/88" : "text-white/78", compact ? "h-4.5 w-4.5" : "h-6 w-6")} />
    </div>
  );
}
