import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn(
      "app-tabs-list theme-tabs scrollbar-hidden inline-flex h-auto w-full items-center justify-start gap-2 overflow-x-auto overflow-y-hidden rounded-[18px] p-1.5 text-muted-foreground",
      className
    )}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      "app-tabs-trigger theme-tab inline-flex shrink-0 items-center justify-center rounded-[14px] border border-transparent px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:border-slate-500/12",
      className
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }: TabsPrimitive.TabsContentProps) => (
  <TabsPrimitive.Content className={cn("app-tabs-content mt-5 outline-none", className)} {...props} />
);
