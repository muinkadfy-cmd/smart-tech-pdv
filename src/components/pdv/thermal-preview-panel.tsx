import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ThermalPreviewPanel({ lines }: { lines: string[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Preview termico</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-[18px] bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-100 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.65)]">
          {lines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
