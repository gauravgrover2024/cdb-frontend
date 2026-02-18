import React from "react";
import { Activity } from "lucide-react";

const RecentApplicationsTable = ({ transactions }) => {
  return (
    <div className="flex-1 min-h-0 bg-white dark:bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="text-lg font-bold leading-none tracking-tight text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Recent Applications
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b sticky top-0 bg-white dark:bg-card z-10">
            <tr className="border-b transition-colors border-border">
              <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider">
                ID
              </th>
              <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Client
              </th>
              <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Type
              </th>
              <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Amount
              </th>
              <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Date
              </th>
              <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0 bg-white dark:bg-card">
            {transactions.map((item, idx) => (
              <tr key={idx} className="border-b transition-colors border-border hover:bg-muted/50">
                <td className="p-6 align-middle text-foreground font-mono text-xs">
                  {item.invoiceId}
                </td>
                <td className="p-6 align-middle text-foreground font-medium">{item.client}</td>
                <td className="p-6 align-middle text-muted-foreground text-xs">{item.role}</td>
                <td className="p-6 align-middle text-foreground font-semibold font-mono">
                  {item.amount}
                </td>
                <td className="p-6 align-middle text-muted-foreground text-xs">{item.date}</td>
                <td className="p-6 align-middle">
                  <div
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      ["disbursed", "approved", "completed"].some((s) =>
                        item.rawStatus.includes(s)
                      )
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : ["rejected", "failed", "declined"].some((s) => item.rawStatus.includes(s))
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {item.status}
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr className="border-b transition-colors border-border">
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No recent records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentApplicationsTable;
