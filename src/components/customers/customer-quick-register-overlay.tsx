import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, MessageCircle, Plus, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUICK_ACCESS_OVERLAY_INNER_FRAME_CLASS, QUICK_ACCESS_OVERLAY_PANEL_CLASS } from "@/components/shared/quick-access-overlay";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/use-app-data";
import { appRepository } from "@/repositories/app-repository";
import { useAppShellStore } from "@/stores/app-shell-store";
import type { CustomerFormValues } from "@/types/domain";

function createEmptyCustomerDraft(): CustomerFormValues {
  return {
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    notes: ""
  };
}

export function CustomerQuickRegisterOverlay() {
  const customerQuickRegisterOpen = useAppShellStore((state) => state.customerQuickRegisterOpen);
  const closeCustomerQuickRegister = useAppShellStore((state) => state.closeCustomerQuickRegister);
  const { reload: reloadCustomers } = useCustomers();
  const [draft, setDraft] = useState<CustomerFormValues>(createEmptyCustomerDraft);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const completion = useMemo(() => {
    const checkpoints = [draft.name.trim(), draft.whatsapp.trim() || draft.phone.trim(), draft.email.trim(), draft.notes.trim()];
    return Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
  }, [draft]);

  useEffect(() => {
    if (!customerQuickRegisterOpen) {
      return;
    }

    setDraft(createEmptyCustomerDraft());
    setFeedback(null);
    setError(null);

    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 120);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCustomerQuickRegister();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [customerQuickRegisterOpen, closeCustomerQuickRegister]);

  if (!customerQuickRegisterOpen) {
    return null;
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      setError("Informe ao menos o nome do cliente para cadastrar.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const created = await appRepository.createCustomer({
        ...draft,
        whatsapp: draft.whatsapp.trim() || draft.phone.trim()
      });
      await reloadCustomers();
      setFeedback(`${created.name} cadastrado com sucesso.`);
      setDraft(createEmptyCustomerDraft());
      window.setTimeout(() => nameInputRef.current?.focus(), 80);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[86] bg-[rgba(4,8,14,0.58)] backdrop-blur-[3px]">
      <div className={QUICK_ACCESS_OVERLAY_INNER_FRAME_CLASS}>
        <section className={QUICK_ACCESS_OVERLAY_PANEL_CLASS}>
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(201,168,111,0.12)] px-4 py-4 lg:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[22px] font-semibold tracking-[-0.03em] text-slate-50 sm:text-[24px] lg:text-[26px]">Cliente rápido</p>
                <Badge variant="outline">F5 global</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-400">Cadastre cliente sem sair da operação atual e siga vendendo no balcão.</p>
            </div>
            <Button onClick={closeCustomerQuickRegister} size="icon" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="native-scroll min-h-0 overflow-y-auto pr-1">
              <div className="rounded-[22px] border border-[rgba(201,168,111,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.026),rgba(255,255,255,0.012))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="premium-tile rounded-[18px] border border-[rgba(201,168,111,0.12)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(214,190,142,0.16)] bg-[rgba(255,255,255,0.04)] text-[#f4e6c8]">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">Nome do cliente</p>
                        <Input
                          className="mt-1 h-10 text-[13px]"
                          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Ex.: Marina Queiroz"
                          ref={nameInputRef}
                          value={draft.name}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="premium-tile rounded-[18px] border border-[rgba(201,168,111,0.12)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">WhatsApp</p>
                    <Input
                      className="mt-1 h-10 text-[13px]"
                      onChange={(event) => setDraft((current) => ({ ...current, whatsapp: event.target.value }))}
                      placeholder="(11) 99999-0000"
                      value={draft.whatsapp}
                    />
                  </div>

                  <div className="premium-tile rounded-[18px] border border-[rgba(201,168,111,0.12)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">Telefone</p>
                    <Input
                      className="mt-1 h-10 text-[13px]"
                      onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="Telefone alternativo"
                      value={draft.phone}
                    />
                  </div>

                  <div className="premium-tile rounded-[18px] border border-[rgba(201,168,111,0.12)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:col-span-2">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">E-mail</p>
                    <Input
                      className="mt-1 h-10 text-[13px]"
                      onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                      placeholder="email@cliente.com"
                      value={draft.email}
                    />
                  </div>

                  <div className="premium-tile rounded-[18px] border border-[rgba(201,168,111,0.12)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:col-span-2">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">Observações</p>
                    <Input
                      className="mt-1 h-10 text-[13px]"
                      onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Preferência, grade, perfil de compra ou recado de atendimento"
                      value={draft.notes}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="native-scroll min-h-0 overflow-y-auto pr-1">
              <div className="flex min-h-full flex-col gap-4">
                <div className="premium-tile rounded-[24px] border border-[rgba(201,168,111,0.12)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-slate-50">Prévia do cliente</p>
                      <p className="mt-1 text-[12px] text-slate-400">Leitura rápida do cadastro antes de salvar.</p>
                    </div>
                    <Badge variant={completion >= 50 ? "success" : "outline"}>{completion}% pronto</Badge>
                  </div>
                  <div className="mt-4 rounded-[24px] border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(145deg,rgba(10,18,42,0.92),rgba(26,142,214,0.82))] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-200">Cliente</p>
                    <p className="mt-3 text-[24px] font-semibold text-white">{draft.name.trim() || "Novo cliente"}</p>
                    <div className="mt-4 space-y-2 text-[12px] text-slate-100/92">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>{draft.whatsapp.trim() || draft.phone.trim() || "WhatsApp ainda não informado"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        <span>{draft.email.trim() || "Contato leve para operação local"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="premium-tile rounded-[22px] border border-[rgba(201,168,111,0.12)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:rgba(214,190,142,0.78)]">Atendimento</p>
                    <p className="mt-2 text-[18px] font-semibold text-slate-50">{draft.whatsapp.trim() || draft.phone.trim() ? "pronto" : "mínimo"}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">Nome e WhatsApp já deixam o contato utilizável no PDV.</p>
                  </div>
                  <div className="premium-tile rounded-[22px] border border-[rgba(201,168,111,0.12)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:rgba(214,190,142,0.78)]">Cadastro</p>
                    <p className="mt-2 text-[18px] font-semibold text-slate-50">{draft.notes.trim() || draft.email.trim() ? "enriquecido" : "leve"}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">Você pode salvar leve agora e completar depois sem perder a operação.</p>
                  </div>
                </div>

                <div className="premium-tile rounded-[24px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-slate-50">Operação rápida</p>
                      <p className="mt-1 text-[12px] text-slate-400">Atalho global para balcão, carteira e atendimento consultivo.</p>
                    </div>
                    <Badge variant="outline">F5 / Esc</Badge>
                  </div>
                  <div className="mt-3 rounded-2xl border border-[rgba(201,168,111,0.12)] bg-black/10 px-3 py-2 text-[12px] leading-6 text-slate-300">
                    Cadastre primeiro nome e WhatsApp. Email e observações podem ser enriquecidos depois, sem travar a venda.
                  </div>
                </div>

                <div className="mt-auto space-y-3 border-t border-[rgba(201,168,111,0.12)] bg-[linear-gradient(180deg,rgba(25,29,36,0),rgba(14,17,23,0.44))] pt-4">
                  {error ? <div className="system-alert system-alert--error">{error}</div> : null}
                  {feedback ? <div className="system-alert system-alert--success">{feedback}</div> : null}
                  <Button className="h-12 justify-center rounded-[18px] text-[15px] shadow-[0_18px_34px_-24px_rgba(217,176,106,0.42)]" disabled={saving} onClick={() => void handleSave()}>
                    <Plus className="h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar cliente"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
