import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="module-header-shell space-y-3 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-44 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-[380px] rounded-2xl" />
          <Skeleton className="h-4 w-full max-w-[620px] rounded-full" />
          <Skeleton className="h-4 w-full max-w-[520px] rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-[138px] rounded-[24px]" key={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="h-[320px] rounded-[28px]" />
        <div className="grid gap-4">
          <Skeleton className="h-[152px] rounded-[24px]" />
          <Skeleton className="h-[152px] rounded-[24px]" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-[270px] rounded-[28px]" />
        <Skeleton className="h-[270px] rounded-[28px]" />
      </div>
    </div>
  );
}
