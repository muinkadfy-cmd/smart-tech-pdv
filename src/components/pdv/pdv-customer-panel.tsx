import type { Customer } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PdvCustomerPanelProps {
  customers: Customer[];
  customerId?: string;
  onCustomerChange: (customerId?: string) => void;
}

export function PdvCustomerPanel({ customers, customerId, onCustomerChange }: PdvCustomerPanelProps) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Cliente da venda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <select className="native-select h-10 w-full text-[13px]" onChange={(event) => onCustomerChange(event.target.value || undefined)} value={customerId ?? ""}>
          <option value="">Consumidor final</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
        <div className="grid gap-3 md:grid-cols-2">
          {customers.slice(0, 2).map((customer) => (
            <div className="panel-block rounded-[18px] p-3.5" key={customer.id}>
              <p className="text-[14px] font-semibold text-slate-950">{customer.name}</p>
              <p className="mt-1 text-[12px] text-slate-600">{customer.phone}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
