import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartPoint } from "@/types/domain";

const colors = ["#2563EB", "#0F172A", "#7C3AED", "#0EA5E9", "#14B8A6"];

export function CategoryChart({ data }: { data: ChartPoint[] }) {
  return (
    <Card className="surface-rule border-white/80 bg-white/92">
      <CardHeader>
        <CardTitle>Mix por categoria</CardTitle>
        <CardDescription>Distribuicao para orientar compra e vitrine.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-[260px]">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Pie data={data} dataKey="value" innerRadius={72} outerRadius={102} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell fill={colors[index % colors.length]} key={entry.label} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {data.map((entry, index) => (
            <div className="flex items-center justify-between rounded-[18px] border border-white/70 bg-secondary/35 px-3.5 py-3" key={entry.label}>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="text-[13px] font-medium text-slate-900">{entry.label}</span>
              </div>
              <span className="text-[13px] font-semibold text-slate-600">{entry.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
