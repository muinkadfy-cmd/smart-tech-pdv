import { useState } from "react";
import { Expand, X } from "lucide-react";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Button } from "@/components/ui/button";
import { isProductImageDataUrl } from "@/features/products/product-image";
import { cn } from "@/lib/utils";
import type { ProductSector } from "@/types/domain";

interface ProductImagePreviewProps {
  name: string;
  imageHint?: string;
  imageDataUrl?: string;
  sector?: ProductSector;
  compact?: boolean;
  className?: string;
  triggerClassName?: string;
  modalDescription?: string;
}

export function ProductImagePreview({
  name,
  imageHint,
  imageDataUrl,
  sector,
  compact,
  className,
  triggerClassName,
  modalDescription
}: ProductImagePreviewProps) {
  const [open, setOpen] = useState(false);
  const hasUploadedImage = isProductImageDataUrl(imageDataUrl);

  if (!hasUploadedImage) {
    return (
      <ProductImagePlaceholder
        className={className}
        compact={compact}
        imageDataUrl={imageDataUrl}
        imageHint={imageHint}
        name={name}
        sector={sector}
      />
    );
  }

  return (
    <>
      <button
        aria-label={`Abrir foto ampliada de ${name}`}
        className={cn("group relative block rounded-2xl text-left", triggerClassName)}
        onClick={() => setOpen(true)}
        type="button"
      >
        <ProductImagePlaceholder
          className={cn("transition-transform duration-200 group-hover:scale-[1.02]", className)}
          compact={compact}
          imageDataUrl={imageDataUrl}
          imageHint={imageHint}
          name={name}
          sector={sector}
        />
        <span className="pointer-events-none absolute right-2 top-2 rounded-full border border-white/14 bg-[rgba(4,8,14,0.56)] p-1.5 text-white/88 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)]">
          <Expand className="h-3.5 w-3.5" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] bg-[rgba(2,6,10,0.84)] backdrop-blur-[5px]"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <div className="flex h-full items-center justify-center p-4 sm:p-6">
            <div
              className="relative w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-[rgba(201,168,111,0.18)] bg-[linear-gradient(180deg,rgba(25,29,36,0.98),rgba(16,19,26,0.985))] shadow-[0_42px_90px_-40px_rgba(0,0,0,0.78)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[rgba(201,168,111,0.12)] px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-slate-50">{name || "Imagem do produto"}</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    {modalDescription ?? "Foto real ampliada, salva localmente para uso offline no catálogo, estoque e PDV."}
                  </p>
                </div>
                <Button onClick={() => setOpen(false)} size="icon" type="button" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-[radial-gradient(circle_at_top,rgba(64,106,172,0.18),transparent_52%)] p-5">
                <img alt={name} className="max-h-[78vh] w-full rounded-[22px] object-contain" src={imageDataUrl} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
