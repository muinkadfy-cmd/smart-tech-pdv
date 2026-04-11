import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardFocusCard } from "@/types/domain";

export function OperationalFocusPanel({ cards }: { cards: DashboardFocusCard[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Foco operacional do turno</CardTitle>
        <CardDescription>Prioridades objetivas para a equipe atacar primeiro, sem poluir a abertura do dia.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link className="premium-tile flex h-full flex-col rounded-[18px] p-3.5 transition hover:border-[rgba(201,168,111,0.2)] hover:translate-y-[-1px]" key={card.id} to={card.actionPath}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-semibold text-slate-50">{card.title}</p>
              <Badge variant={card.tone === "warning" ? "warning" : card.tone === "success" ? "success" : "outline"}>{card.actionLabel}</Badge>
            </div>
            <p className="mt-2.5 flex-1 text-[13px] leading-5 text-slate-400">{card.description}</p>
            <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#e5d2a4]">
              <span>Ir agora</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
