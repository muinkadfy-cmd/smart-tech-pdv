import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type FormAssistTone = "info" | "warning" | "success";

interface FormAssistPanelProps {
  title: string;
  description: string;
  tips?: string[];
  tone?: FormAssistTone;
  className?: string;
}

const toneMap = {
  info: {
    icon: Info,
    iconClassName: "text-[color:rgba(214,190,142,0.9)]",
    borderClassName: "border-[rgba(201,168,111,0.16)]",
    backgroundClassName: "bg-[linear-gradient(180deg,rgba(43,39,31,0.46),rgba(29,27,23,0.56))]"
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "text-amber-200",
    borderClassName: "border-amber-300/16",
    backgroundClassName: "bg-[linear-gradient(180deg,rgba(73,52,17,0.42),rgba(48,35,12,0.56))]"
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-200",
    borderClassName: "border-emerald-300/16",
    backgroundClassName: "bg-[linear-gradient(180deg,rgba(17,62,45,0.42),rgba(13,40,31,0.56))]"
  }
} satisfies Record<FormAssistTone, { icon: typeof Info; iconClassName: string; borderClassName: string; backgroundClassName: string }>;

export function FormAssistPanel({ title, description, tips = [], tone = "info", className }: FormAssistPanelProps) {
  const toneConfig = toneMap[tone];
  const Icon = toneConfig.icon;

  return (
    <div
      className={cn(
        "form-assist-panel rounded-[20px] border px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_34px_-30px_rgba(0,0,0,0.46)]",
        toneConfig.borderClassName,
        toneConfig.backgroundClassName,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", toneConfig.iconClassName)} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-50">{title}</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-300">{description}</p>
          {tips.length > 0 ? (
            <div className="form-assist-tips mt-3 grid gap-1.5">
              {tips.map((tip) => (
                <p className="text-[12px] leading-5 text-slate-400" key={tip}>
                  {tip}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
