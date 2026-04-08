import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-40" key={index} />
        ))}
      </div>
      <Skeleton className="h-[360px] w-full" />
    </div>
  );
}
