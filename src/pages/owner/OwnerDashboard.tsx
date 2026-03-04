import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/formatCurrency";
import { BarChart3, TrendingUp, Receipt, Eye, Trash2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface TxItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

const paymentLabel: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer Bank",
  ewallet: "E-Wallet",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  completed: { label: "Selesai", variant: "default" },
};

export default function OwnerDashboard() {
  const [period, setPeriod] = useState("today");
  const [detailTxId, setDetailTxId] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<TxItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  const queryClient = useQueryClient();
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

    const completed = transactions.filter((t) => t.status === "completed");
    const today = completed.filter((t) => t.created_at >= todayStart).reduce((s, t) => s + t.total, 0);
    const todayCount = completed.filter((t) => t.created_at >= todayStart).length;
    const week = completed.filter((t) => t.created_at >= weekStart).reduce((s, t) => s + t.total, 0);
    const month = completed.filter((t) => t.created_at >= monthStart).reduce((s, t) => s + t.total, 0);
    return { today, week, month, todayCount };
  }, [transactions]);

  const chartData = useMemo(() => {
    if (!transactions) return [];
    const completed = transactions.filter((t) => t.status === "completed");
    const days = period === "monthly" ? 30 : 7;
    const data: { date: string; total: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const label = format(d, period === "monthly" ? "dd MMM" : "EEE", { locale: idLocale });
      const dayTotal = completed
        .filter((t) => t.created_at.startsWith(dateStr))
        .reduce((s, t) => s + t.total, 0);
      data.push({ date: label, total: dayTotal });
    }
    return data;
  }, [transactions, period]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      if (filterStatus !== "all" && tx.status !== filterStatus) return false;
      if (filterPayment !== "all" && tx.payment_method !== filterPayment) return false;
      if (filterDate && !tx.created_at.startsWith(filterDate)) return false;
      return true;
    });
  }, [transactions, filterStatus, filterPayment, filterDate]);

  const openDetail = async (txId: string) => {
    setDetailTxId(txId);
    setDetailLoading(true);
    setDetailItems([]);
    try {
      const { data } = await supabase
        .from("transaction_items")
        .select("id, menu_item_name, quantity, price, subtotal")
        .eq("transaction_id", txId);
      setDetailItems(data ?? []);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailTxId(null);
    setDetailItems([]);
  };

  const handleDelete = async (txId: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", txId);
      if (error) throw error;
      toast({ title: "Transaksi dihapus" });
      setDeleteTxId(null);
      queryClient.invalidateQueries({ queryKey: ["owner-transactions"] });
      if (detailTxId === txId) closeDetail();
    } catch (err: unknown) {
      toast({
        title: "Gagal menghapus transaksi",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const detailTx = detailTxId ? (transactions ?? []).find((t) => t.id === detailTxId) : null;

  const summaryCards = [
    { title: "Hari Ini", value: formatRupiah(stats.today), sub: `${stats.todayCount} transaksi`, icon: Receipt, color: "text-primary" },
    { title: "Minggu Ini", value: formatRupiah(stats.week), icon: TrendingUp, color: "text-emerald-500" },
    { title: "Bulan Ini", value: formatRupiah(stats.month), icon: BarChart3, color: "text-blue-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard Owner</h1>
          <p className="text-sm text-muted-foreground">Ringkasan performa restoran</p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">Grafik Penjualan</CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">7 Hari</SelectItem>
                <SelectItem value="monthly">30 Hari</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-56 sm:h-72">
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
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Transaksi Terbaru
            </CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger>
                  <SelectValue placeholder="Pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pembayaran</SelectItem>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Tanggal"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Tidak ada transaksi ditemukan.</p>
              ) : (
                filteredTransactions.slice(0, 20).map((tx) => {
                  const sc = statusConfig[tx.status] ?? { label: tx.status, variant: "secondary" as const };
                  return (
                    <div key={tx.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-muted/50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{formatRupiah(tx.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString("id-ID")} • {paymentLabel[tx.payment_method] ?? tx.payment_method}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openDetail(tx.id)}>
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTxId(tx.id)}
                          aria-label="Hapus transaksi"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Badge variant={sc.variant} className={tx.status === "pending" ? "border-amber-500 text-amber-600" : ""}>
                          {sc.label}
                        </Badge>
                        <Badge variant={tx.is_synced ? "default" : "outline"} className={!tx.is_synced ? "border-amber-500 text-amber-600" : ""}>
                          {tx.is_synced ? "Synced" : "Offline"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!detailTxId} onOpenChange={(open) => !open && closeDetail()}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Transaksi</DialogTitle>
            </DialogHeader>
            {detailTx && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="font-medium">
                    {format(new Date(detailTx.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                  </span>
                  <Badge variant={statusConfig[detailTx.status]?.variant ?? "secondary"}>
                    {statusConfig[detailTx.status]?.label ?? detailTx.status}
                  </Badge>
                  <Badge variant="secondary">
                    {paymentLabel[detailTx.payment_method] ?? detailTx.payment_method}
                  </Badge>
                  <Badge variant={detailTx.is_synced ? "default" : "outline"} className={!detailTx.is_synced ? "border-amber-500 text-amber-600" : ""}>
                    {detailTx.is_synced ? "Synced" : "Offline"}
                  </Badge>
                </div>

                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat detail...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item pesanan</p>
                    <ul className="divide-y rounded-lg border">
                      {detailItems.map((item) => (
                        <li key={item.id} className="flex justify-between items-center py-3 px-3 text-sm">
                          <span>
                            {item.menu_item_name} × {item.quantity}
                          </span>
                          <span className="font-medium">{formatRupiah(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between text-base font-bold pt-2">
                      <span>Total</span>
                      <span className="text-primary">{formatRupiah(detailTx.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTxId} onOpenChange={(open) => !open && setDeleteTxId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
              <AlertDialogDescription>
                Transaksi ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (deleteTxId) handleDelete(deleteTxId);
                }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
