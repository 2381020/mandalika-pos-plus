import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/formatCurrency";
import { BarChart3, TrendingUp, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function OwnerDashboard() {
  const [period, setPeriod] = useState("today");

  const { data: transactions } = useQuery({
    queryKey: ["owner-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    if (!transactions) return { today: 0, week: 0, month: 0, todayCount: 0 };
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();

    const today = transactions.filter((t) => t.created_at >= todayStart).reduce((s, t) => s + t.total, 0);
    const todayCount = transactions.filter((t) => t.created_at >= todayStart).length;
    const week = transactions.filter((t) => t.created_at >= weekStart).reduce((s, t) => s + t.total, 0);
    const month = transactions.filter((t) => t.created_at >= monthStart).reduce((s, t) => s + t.total, 0);
    return { today, week, month, todayCount };
  }, [transactions]);

  const chartData = useMemo(() => {
    if (!transactions) return [];
    const days = period === "monthly" ? 30 : 7;
    const data: { date: string; total: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const label = format(d, period === "monthly" ? "dd MMM" : "EEE", { locale: idLocale });
      const dayTotal = (transactions ?? [])
        .filter((t) => t.created_at.startsWith(dateStr))
        .reduce((s, t) => s + t.total, 0);
      data.push({ date: label, total: dayTotal });
    }
    return data;
  }, [transactions, period]);

  const summaryCards = [
    { title: "Hari Ini", value: formatRupiah(stats.today), sub: `${stats.todayCount} transaksi`, icon: Receipt, color: "text-primary" },
    { title: "Minggu Ini", value: formatRupiah(stats.week), icon: TrendingUp, color: "text-success" },
    { title: "Bulan Ini", value: formatRupiah(stats.month), icon: BarChart3, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Owner</h1>
          <p className="text-sm text-muted-foreground">Ringkasan performa restoran</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Grafik Penjualan</CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">7 Hari</SelectItem>
                <SelectItem value="monthly">30 Hari</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatRupiah(value), "Penjualan"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(transactions ?? []).slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{formatRupiah(tx.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString("id-ID")} • {tx.payment_method}
                    </p>
                  </div>
                  <Badge variant={tx.is_synced ? "default" : "outline"} className={!tx.is_synced ? "text-warning border-warning" : ""}>
                    {tx.is_synced ? "Synced" : "Offline"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Badge({ variant, className, children }: { variant: string; className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      variant === "default" ? "bg-success/10 text-success" : `border ${className}`
    }`}>
      {children}
    </span>
  );
}
