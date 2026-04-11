import { formatDate } from "@/lib/utils";
import { getRecentAuditEntriesByArea } from "@/services/audit/audit-log.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RecentAreaAuditPanelProps {
  area: string;
  title: string;
  description: string;
  emptyMessage: string;
  limit?: number;
}

export function RecentAreaAuditPanel({
  area,
  title,
  description,
  emptyMessage,
  limit = 5
}: RecentAreaAuditPanelProps) {
  const entries = getRecentAuditEntriesByArea(area, limit);

  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div className="panel-block rounded-[18px] p-3.5" key={entry.id}>
              <p className="text-[13px] font-semibold text-slate-50">{entry.action}</p>
              <p className="mt-2 text-[13px] text-slate-400">{entry.details}</p>
              {entry.actorName ? (
                <p className="mt-2 text-[12px] text-slate-400">
                  Por {entry.actorName}{entry.actorRole ? ` • ${entry.actorRole}` : ""}
                </p>
              ) : null}
              <p className="mt-2 text-[12px] text-slate-400">{formatDate(entry.createdAt)}</p>
            </div>
          ))
        ) : (
          <div className="empty-state-box text-sm">{emptyMessage}</div>
        )}
      </CardContent>
    </Card>
  );
}
