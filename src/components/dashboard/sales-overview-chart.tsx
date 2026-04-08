import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartPoint } from "@/types/domain";
import { formatCurrency } from "@/lib/utils";

export function SalesOverviewChart({ data }: { data: ChartPoint[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Vendas da semana</CardTitle>
        <CardDescription>Leitura rapida para decidir reposicao e intensidade do balcão.</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] pt-1">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={12} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Area dataKey="value" fill="url(#salesGradient)" stroke="#2563EB" strokeWidth={3} type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
