import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, DollarSign, Receipt, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/lib/formatCurrency";
import { getOfflineTransactions } from "@/lib/offlineDb";
import { useEffect, useState } from "react";

export default function KasirDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    getOfflineTransactions().then((txs) => setOfflineCount(txs.length));
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const { data: todayStats } = useQuery({
    queryKey: ["kasir-today-stats", user?.id, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("total")
        .eq("cashier_id", user!.id)
        .gte("created_at", today + "T00:00:00")
        .lte("created_at", today + "T23:59:59");
      const count = data?.length ?? 0;
      const totalSales = data?.reduce((sum, t) => sum + t.total, 0) ?? 0;
      return { count, totalSales };
    },
    enabled: !!user,
  });

  const stats = [
    { title: "Transaksi Hari Ini", value: todayStats?.count ?? 0, icon: Receipt, color: "text-primary" },
    { title: "Total Penjualan", value: formatRupiah(todayStats?.totalSales ?? 0), icon: DollarSign, color: "text-success" },
    { title: "Belum Tersinkron", value: offlineCount, icon: AlertCircle, color: offlineCount > 0 ? "text-warning" : "text-muted-foreground" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Dashboard Kasir</h1>
            <p className="text-muted-foreground text-sm">Ringkasan aktivitas hari ini</p>
          </div>
          <Button size="lg" onClick={() => navigate("/kasir/transaksi")} className="gap-2 w-full sm:w-auto shrink-0">
            <ShoppingCart className="h-4 w-4" />
            Transaksi Baru
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
