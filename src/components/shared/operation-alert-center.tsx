import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOperationAlertStore, type OperationAlertItem } from "@/stores/operation-alert-store";

function getAlertToneMeta(tone: OperationAlertItem["tone"]) {
  switch (tone) {
    case "error":
      return {
        icon: XCircle,
        className: "border-rose-400/24 bg-[linear-gradient(180deg,rgba(77,25,31,0.96),rgba(52,18,23,0.98))] text-rose-50"
      };
    case "warning":
      return {
        icon: TriangleAlert,
        className: "border-amber-300/24 bg-[linear-gradient(180deg,rgba(78,55,19,0.96),rgba(59,39,14,0.98))] text-amber-50"
      };
    case "info":
      return {
        icon: Info,
        className: "border-sky-400/24 bg-[linear-gradient(180deg,rgba(23,53,77,0.96),rgba(15,39,58,0.98))] text-sky-50"
      };
    default:
      return {
        icon: CheckCircle2,
        className: "border-emerald-400/24 bg-[linear-gradient(180deg,rgba(20,63,50,0.96),rgba(12,43,35,0.98))] text-emerald-50"
      };
  }
}

export function OperationAlertCenter() {
  const items = useOperationAlertStore((state) => state.items);
  const remove = useOperationAlertStore((state) => state.remove);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    const timers = items.map((item) =>
      window.setTimeout(() => {
        remove(item.id);
      }, 5200)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items, remove]);

  if (!items.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[95] flex w-[408px] max-w-[calc(100vw-1.5rem)] flex-col gap-3">
      {items.map((item) => {
        const meta = getAlertToneMeta(item.tone);
        const Icon = meta.icon;
        return (
          <div
            className={cn(
              "pointer-events-auto rounded-[24px] border p-4 shadow-[0_28px_50px_-28px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur transition-all duration-200",
              meta.className
            )}
            key={item.id}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                {item.area ? <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{item.area}</p> : null}
                <p className="mt-1 text-[14px] font-semibold leading-5">{item.title}</p>
                <p className="mt-1 text-[12px] leading-5 text-white/80">{item.description}</p>
              </div>
              <Button className="h-7 w-7 rounded-full text-white/80 hover:text-white" onClick={() => remove(item.id)} size="icon" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
