import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsSnapshot } from "@/hooks/use-app-data";
import { LABEL_PRINT_TEMPLATE_OPTIONS, SALE_PRINT_BEHAVIOR_OPTIONS, SALE_PRINT_TEMPLATE_OPTIONS } from "@/features/printing/printing.service";
import { applyAppTheme } from "@/lib/theme";
import { appRepository } from "@/repositories/app-repository";
import type { SettingsSnapshot } from "@/types/domain";

const initialForm: SettingsSnapshot = {
  companyName: "",
  document: "",
  theme: "Windows Contrast",
  thermalPrinter58: "",
  thermalPrinter80: "",
  defaultSalePrintTemplate: "tpl-58",
  defaultLabelTemplate: "tpl-label",
  salePrintBehavior: "preview",
  autoBackup: "Diario as 22:00",
  updaterChannel: "stable"
};

export default function SettingsPage() {
  const { data, loading, reload } = useSettingsSnapshot();
  const [form, setForm] = useState<SettingsSnapshot>(initialForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm({ ...data, theme: "Windows Contrast" });
    }
  }, [data]);

  useEffect(() => {
    applyAppTheme(form.theme);
  }, [form.theme]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(data ?? initialForm), [data, form]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const saved = await appRepository.updateSettings({ ...form, theme: "Windows Contrast" });
      setForm(saved);
      setFeedback("Configuracoes salvas no banco local com sucesso.");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar as configuracoes.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof SettingsSnapshot>(field: K, value: SettingsSnapshot[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  if (loading || !data) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={hasChanges ? "warning" : "success"}>{hasChanges ? "Alteracoes pendentes" : "Tudo salvo"}</Badge>
            <Button disabled={!hasChanges || saving} onClick={handleSave}>
              {saving ? "Salvando..." : "Salvar configuracoes"}
            </Button>
          </div>
        }
        badge="Sub-abas para nao alongar a tela"
        description="Configuracoes reais de loja, impressao, backup e release para deixar o desktop pronto para uso offline com cara de sistema Windows nativo."
        eyebrow="Configuracoes"
        title="Painel de ajustes do sistema"
      />

      {error ? <div className="system-alert system-alert--error">{error}</div> : null}
      {feedback ? <div className="system-alert system-alert--success">{feedback}</div> : null}

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="impressao">Impressao</TabsTrigger>
          <TabsTrigger value="pdv">PDV</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="atualizacoes">Atualizacoes</TabsTrigger>
          <TabsTrigger value="aparencia">Aparencia</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card className="surface-rule border-white/80 bg-white/90 shadow-card">
            <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nome da empresa</p>
                <Input onChange={(event) => updateField("companyName", event.target.value)} value={form.companyName} />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Documento</p>
                <Input onChange={(event) => updateField("document", event.target.value)} value={form.document} />
              </div>
              <div className="theme-preview-card">
                <p className="text-sm text-muted-foreground">Resumo rapido</p>
                <p className="mt-2 font-semibold text-slate-950">{form.companyName}</p>
                <p className="mt-1 text-sm text-muted-foreground">Documento principal {form.document}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impressao">
          <Card className="surface-rule border-white/80 bg-white/90 shadow-card">
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Impressora 58mm</p>
                  <Input onChange={(event) => updateField("thermalPrinter58", event.target.value)} value={form.thermalPrinter58} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Impressora 80mm</p>
                  <Input onChange={(event) => updateField("thermalPrinter80", event.target.value)} value={form.thermalPrinter80} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Template padrao do PDV</p>
                  <select
                    className="native-select h-11 w-full text-sm"
                    onChange={(event) => updateField("defaultSalePrintTemplate", event.target.value)}
                    value={form.defaultSalePrintTemplate}
                  >
                    {SALE_PRINT_TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Etiqueta padrao</p>
                  <select
                    className="native-select h-11 w-full text-sm"
                    onChange={(event) => updateField("defaultLabelTemplate", event.target.value)}
                    value={form.defaultLabelTemplate}
                  >
                    {LABEL_PRINT_TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Acao apos fechar venda</p>
                  <select
                    className="native-select h-11 w-full text-sm"
                    onChange={(event) => updateField("salePrintBehavior", event.target.value)}
                    value={form.salePrintBehavior}
                  >
                    {SALE_PRINT_BEHAVIOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="theme-preview-card">
                  <p className="text-sm text-muted-foreground">Caixa rapido</p>
                  <p className="mt-2 font-semibold text-slate-950">{form.defaultSalePrintTemplate === "tpl-80" ? "Cupom detalhado 80 mm" : "Comprovante PDV 58 mm"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Define o padrao do operador no fechamento da venda e reduz clique repetido no balcao.</p>
                </div>
                <div className="theme-preview-card">
                  <p className="text-sm text-muted-foreground">Politica automatica</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {form.salePrintBehavior === "auto" ? "Abre e chama impressao" : form.salePrintBehavior === "preview" ? "Abre preview para conferencia" : "Fluxo manual"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Mantem o offline forte e deixa cada loja escolher entre agilidade ou revisao antes da impressao.</p>
                </div>
                <div className="theme-preview-card">
                  <p className="text-sm text-muted-foreground">Etiqueta operacional</p>
                  <p className="mt-2 font-semibold text-slate-950">{form.defaultLabelTemplate === "tpl-stock" ? "Reposicao rapida / A4" : "Etiqueta de produto"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Ajuda a separar varejo, reposicao e conferencia sem quebrar o sistema unico de calcados e roupas.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdv">
          <Card className="surface-rule border-white/80 bg-white/90 shadow-card">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              {[
                ["Atalhos de teclado", "F2 para venda, F9 para fechamento e Ctrl+K para busca."],
                ["Cliente opcional", "Fluxo preparado para venda rapida sem travar a operacao do balcao."],
                ["Desconto controlado", "Base pronta para governanca por usuario e permissoes futuras."]
              ].map(([title, helper]) => (
                <div className="theme-preview-card" key={title}>
                  <p className="font-semibold text-slate-950">{title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card className="surface-rule border-white/80 bg-white/90 shadow-card">
            <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_280px]">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Rotina automatica</p>
                <select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("autoBackup", event.target.value)} value={form.autoBackup}>
                  <option value="Diario as 22:00">Diario as 22:00</option>
                  <option value="Diario as 18:00">Diario as 18:00</option>
                  <option value="A cada 6 horas">A cada 6 horas</option>
                  <option value="Manual com alerta">Manual com alerta</option>
                </select>
              </div>
              <div className="theme-preview-card">
                <p className="text-sm text-muted-foreground">Modo atual</p>
                <p className="mt-2 font-semibold text-slate-950">{form.autoBackup}</p>
                <p className="mt-2 text-sm text-muted-foreground">Mantem o desktop pronto para o cliente trabalhar offline com risco menor de perda.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atualizacoes">
          <Card className="surface-rule border-white/80 bg-white/90 shadow-card">
            <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_280px]">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Canal do updater</p>
                <select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("updaterChannel", event.target.value)} value={form.updaterChannel}>
                  <option value="stable">Stable</option>
                  <option value="beta">Beta</option>
                </select>
              </div>
              <div className="theme-preview-card">
                <p className="text-sm text-muted-foreground">Politica recomendada</p>
                <p className="mt-2 font-semibold text-slate-950">{form.updaterChannel === "beta" ? "Beta para homologacao" : "Stable para cliente final"}</p>
                <p className="mt-2 text-sm text-muted-foreground">Deixa a operacao principal protegida e leva melhorias por pacote futuro.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card className="surface-rule border-white/80 bg-white/90 shadow-card">
            <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_280px]">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tema da interface</p>
                <div className="theme-preview-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">Windows Contrast</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Tema unico do sistema, fixado para manter leitura forte, estrutura de software pago e navegacao clara para o operador.
                      </p>
                    </div>
                    <Badge variant="success">Ativo</Badge>
                  </div>
                </div>
              </div>
              <div className="theme-preview-card">
                <p className="text-sm text-muted-foreground">Estilo atual</p>
                <p className="mt-2 font-semibold text-slate-950">Windows Contrast</p>
                <p className="mt-2 text-sm text-muted-foreground">Pensado para parecer app desktop instalado, com contornos mais fortes, contraste mais claro e leitura firme no monitor comercial.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
