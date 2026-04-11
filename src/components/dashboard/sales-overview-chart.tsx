import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartPoint } from "@/types/domain";
import { formatCurrency } from "@/lib/utils";

export function SalesOverviewChart({ data }: { data: ChartPoint[] }) {
  const topDay = [...data].sort((left, right) => right.value - left.value)[0];
  const total = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <Card className="executive-panel">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Vendas da semana</CardTitle>
          <CardDescription>Leitura rápida para decidir reposição, campanha e intensidade do balcão.</CardDescription>
        </div>
        <div className="premium-tile min-w-[180px] rounded-[18px] px-3 py-2.5 xl:min-w-[220px]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Melhor dia</p>
          <p className="mt-1 text-[15px] font-semibold text-slate-50">{topDay?.label ?? "Sem leitura"}</p>
          <p className="mt-1 text-[12px] text-slate-400">Semana acumulada em {formatCurrency(total)}.</p>
        </div>
      </CardHeader>
      <CardContent className="h-[280px] pt-1">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#C9A86F" stopOpacity={0.38} />
                <stop offset="55%" stopColor="#9F7C46" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#9F7C46" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(201, 168, 111, 0.14)" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={12} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Area dataKey="value" fill="url(#salesGradient)" stroke="#C9A86F" strokeWidth={3} type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
