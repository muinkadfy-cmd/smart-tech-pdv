import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types/domain";

interface PdvCustomerPanelProps {
  customers: Customer[];
  customerId?: string;
  onCustomerChange: (customerId?: string) => void;
}

export function PdvCustomerPanel({ customers, customerId, onCustomerChange }: PdvCustomerPanelProps) {
  const selectedCustomer = customerId ? customers.find((customer) => customer.id === customerId) ?? null : null;
  const highlightedCustomers = customers
    .slice()
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
    .slice(0, 3);

  return (
    <Card className="executive-panel">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Cliente da venda</CardTitle>
            <p className="mt-1 text-[13px] text-slate-400">Selecione um cadastro para aproveitar histórico, ticket médio e relacionamento no balcão.</p>
          </div>
          <Badge variant="outline">{selectedCustomer ? "Cliente vinculado" : "Consumidor final"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <select className="native-select h-11 w-full text-[13px]" onChange={(event) => onCustomerChange(event.target.value || undefined)} value={customerId ?? ""}>
          <option value="">Consumidor final</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.9fr)]">
          <div className="premium-tile rounded-[18px] p-4">
            {selectedCustomer ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-slate-50">{selectedCustomer.name}</p>
                    <p className="mt-1 text-[12px] text-slate-400">{selectedCustomer.whatsapp || selectedCustomer.phone || "Contato não informado"}</p>
                  </div>
                  <Badge variant={selectedCustomer.status === "active" ? "success" : "outline"}>{selectedCustomer.status === "active" ? "Carteira ativa" : "Carteira inativa"}</Badge>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="panel-block rounded-[16px] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ticket médio</p>
                    <p className="mt-1 text-[15px] font-semibold text-slate-50">{formatCurrency(selectedCustomer.averageTicket)}</p>
                  </div>
                  <div className="panel-block rounded-[16px] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Lifetime</p>
                    <p className="mt-1 text-[15px] font-semibold text-slate-50">{formatCurrency(selectedCustomer.lifetimeValue)}</p>
                  </div>
                  <div className="panel-block rounded-[16px] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Última compra</p>
                    <p className="mt-1 text-[15px] font-semibold text-slate-50">
                      {selectedCustomer.lastPurchaseAt ? new Date(selectedCustomer.lastPurchaseAt).toLocaleDateString("pt-BR") : "Sem histórico"}
                    </p>
                  </div>
                </div>

                {selectedCustomer.notes ? <p className="text-[12px] leading-5 text-slate-300">{selectedCustomer.notes}</p> : null}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[14px] font-semibold text-slate-50">Venda sem cadastro vinculado</p>
                <p className="text-[12px] leading-5 text-slate-400">
                  O PDV segue liberado para consumidor final. Vincule um cliente quando quiser recuperar histórico de compra, ticket e dados para relacionamento.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Atalhos da carteira</p>
            {highlightedCustomers.map((customer) => {
              const isSelected = customer.id === selectedCustomer?.id;
              return (
                <div className="panel-block flex items-center justify-between gap-3 rounded-[16px] p-3" key={customer.id}>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-50">{customer.name}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-400">{customer.whatsapp || customer.phone || "Sem contato"}</p>
                  </div>
                  <Button onClick={() => onCustomerChange(isSelected ? undefined : customer.id)} size="sm" type="button" variant={isSelected ? "secondary" : "outline"}>
                    {isSelected ? "Vinculado" : "Selecionar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
