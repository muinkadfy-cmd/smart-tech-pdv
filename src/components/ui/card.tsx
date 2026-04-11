import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "app-card rounded-[22px] border border-[rgba(201,168,111,0.12)] bg-[linear-gradient(180deg,rgba(33,38,47,0.98),rgba(24,28,36,0.985))] text-card-foreground shadow-[0_22px_38px_-30px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-200",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("app-card-header space-y-1.5 p-4 pb-3", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-display text-base font-semibold tracking-tight text-slate-50", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-[13px] leading-5 text-slate-400", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("app-card-content px-4 pb-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("app-card-footer flex items-center px-4 pb-4", className)} {...props} />
));
CardFooter.displayName = "CardFooter";
