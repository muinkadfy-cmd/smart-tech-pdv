import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReleaseReadinessSnapshot } from "@/features/updates/release-readiness.service";

function getTone(score: number) {
  if (score >= 85) {
    return {
      badge: "success" as const,
      label: "Pronto",
      accent: "text-emerald-700",
      ring: "border-emerald-200 bg-emerald-50/80"
    };
  }

  if (score >= 60) {
    return {
      badge: "outline" as const,
      label: "Ajustar",
      accent: "text-amber-700",
      ring: "border-amber-200 bg-amber-50/80"
    };
  }

  return {
    badge: "secondary" as const,
    label: "Pendente",
    accent: "text-slate-700",
    ring: "border-slate-200 bg-slate-100/90"
  };
}

export function ReleaseReadinessPanel({ snapshot }: { snapshot: ReleaseReadinessSnapshot | null }) {
  if (!snapshot) {
    return (
      <Card className="surface-rule">
        <CardHeader>
          <CardTitle>Prontidão do release</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="empty-state-box">Carregando sinais do runtime, updater e ambiente atual para orientar a próxima release.</div>
        </CardContent>
      </Card>
    );
  }

  const tone = getTone(snapshot.score);

  return (
    <Card className="surface-rule">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Prontidão do release</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{snapshot.headline}</p>
          </div>
          <Badge variant={tone.badge}>{tone.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-3xl border px-5 py-4 ${tone.ring}`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Score atual</p>
              <p className={`mt-2 font-display text-4xl font-semibold ${tone.accent}`}>{snapshot.score}%</p>
            </div>
            <p className="max-w-xs text-right text-sm leading-6 text-slate-400">{snapshot.headline}</p>
          </div>
        </div>
        <div className="grid gap-3">
          {snapshot.checks.map((check) => {
            const ToneIcon = check.ok ? CheckCircle2 : CircleAlert;
            return (
              <div className="premium-tile rounded-2xl p-4" key={check.id}>
                <div className="flex items-start gap-3">
                  <ToneIcon className={`mt-0.5 h-4 w-4 shrink-0 ${check.ok ? "text-emerald-600" : "text-amber-600"}`} />
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-50">{check.label}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{check.helper}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
