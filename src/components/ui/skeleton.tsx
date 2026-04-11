import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-premium animate-pulse rounded-2xl", className)} />;
}
