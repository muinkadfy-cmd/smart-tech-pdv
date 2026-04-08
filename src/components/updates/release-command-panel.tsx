import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReleaseCommandItem } from "@/features/updates/updates.service";

function getVariant(tone: ReleaseCommandItem["tone"]) {
  if (tone === "primary") return "success" as const;
  if (tone === "warning") return "outline" as const;
  return "secondary" as const;
}

export function ReleaseCommandPanel({ items }: { items: ReleaseCommandItem[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(command: string, id: string) {
    if (!navigator?.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(command);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1800);
  }

  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Comandos do lote</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Fluxo pronto para PowerShell, com leitura rapida do passo certo antes de subir para o GitHub.
            </p>
          </div>
          <Badge variant="outline">Windows PowerShell</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="rounded-2xl bg-secondary/40 p-4" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <Badge variant={getVariant(item.tone)}>{item.label}</Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.helper}</p>
              </div>
              <Button onClick={() => void handleCopy(item.command, item.id)} size="sm" variant="outline">
                {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedId === item.id ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-[13px] text-slate-100">
              <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <span className="break-all">{item.command}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
