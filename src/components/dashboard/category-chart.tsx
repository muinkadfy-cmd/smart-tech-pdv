import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartPoint } from "@/types/domain";

const colors = ["#C9A86F", "#9F7C46", "#6E5A3A", "#B89A6D", "#7D6A4E"];

export function CategoryChart({ data }: { data: ChartPoint[] }) {
  const leadingCategory = [...data].sort((left, right) => right.value - left.value)[0];

  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Mix por categoria</CardTitle>
        <CardDescription>Distribuição para orientar compra, exposição e reforço de vitrine.</CardDescription>
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
          <div className="premium-tile rounded-[18px] border border-[rgba(201,168,111,0.14)] px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Categoria líder</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-50">{leadingCategory?.label ?? "Sem leitura"}</p>
            <p className="mt-1 text-[12px] text-slate-400">Melhor composição do mix para expor e recomprar agora.</p>
          </div>
          {data.map((entry, index) => (
            <div className="premium-tile flex items-center justify-between rounded-[18px] border border-[rgba(201,168,111,0.14)] px-3.5 py-3" key={entry.label}>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="text-[13px] font-medium text-slate-100">{entry.label}</span>
              </div>
              <span className="text-[13px] font-semibold text-slate-300">{entry.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
