import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardFocusCard } from "@/types/domain";

export function OperationalFocusPanel({ cards }: { cards: DashboardFocusCard[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Foco operacional do turno</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <Link className="rounded-[18px] border border-border/75 bg-white/78 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] transition hover:border-slate-300 hover:bg-secondary/50" key={card.id} to={card.actionPath}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-semibold text-slate-950">{card.title}</p>
              <Badge variant={card.tone === "warning" ? "warning" : card.tone === "success" ? "success" : "outline"}>{card.actionLabel}</Badge>
            </div>
            <p className="mt-2.5 text-[13px] leading-5 text-slate-600">{card.description}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
