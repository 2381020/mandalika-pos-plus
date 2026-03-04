import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { updateOfflineTransactionStatus } from "@/lib/offlineDb";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatCurrency";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Receipt, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransactionItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  total: number;
  payment_method: string;
  status: string;
  failure_reason?: string | null;
  created_at: string;
  items?: TransactionItem[];
}

const paymentLabel: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer Bank",
  ewallet: "E-Wallet",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Menunggu Pembayaran", className: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
  completed: { label: "Selesai", className: "border-primary text-primary bg-primary/10" },
  failed: { label: "Gagal", className: "border-destructive text-destructive bg-destructive/10" },
};

export default function RiwayatPesanan() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [failingId, setFailingId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterStatus !== "all" && tx.status !== filterStatus) return false;
      if (filterPayment !== "all" && tx.payment_method !== filterPayment) return false;
      if (filterDate && !tx.created_at.startsWith(filterDate)) return false;
      return true;
    });
  }, [transactions, filterStatus, filterPayment, filterDate]);
  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, total, payment_method, status, failure_reason, created_at")
        .eq("cashier_id", user.id)
        .order("created_at", { ascending: false });
      setTransactions(data ?? []);
      setLoading(false);
    };
    fetchTransactions();
  }, [user]);

  const toggleExpand = async (txId: string) => {
    if (expandedId === txId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(txId);
    const tx = transactions.find((t) => t.id === txId);
    if (tx?.items) return;
    const { data } = await supabase
      .from("transaction_items")
      .select("id, menu_item_name, quantity, price, subtotal")
      .eq("transaction_id", txId);
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, items: data ?? [] } : t))
    );
  };

  const handleComplete = async (txId: string) => {
    setProcessingId(txId);
    try {
      if (isOnline) {
        const { error } = await supabase
          .from("transactions")
          .update({ status: "completed" })
          .eq("id", txId);
        if (error) throw error;
      } else {
        await updateOfflineTransactionStatus(txId, "completed");
      }
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: "completed" } : t))
      );
      toast({ title: "Transaksi selesai", description: "Transaksi telah masuk ke owner" });
    } catch (err: any) {
      toast({ title: "Gagal menyelesaikan transaksi", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFailed = async (txId: string) => {
    if (!failureReason.trim()) {
      toast({ title: "Alasan wajib diisi", variant: "destructive" });
      return;
    }
    setProcessingId(txId);
    try {
      if (isOnline) {
        const { error } = await supabase
          .from("transactions")
          .update({ status: "failed", failure_reason: failureReason.trim() } as any)
          .eq("id", txId);
        if (error) throw error;
      } else {
        await updateOfflineTransactionStatus(txId, "failed");
      }
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: "failed", failure_reason: failureReason.trim() } : t))
      );
      setFailingId(null);
      setFailureReason("");
      toast({ title: "Transaksi ditandai gagal" });
    } catch (err: any) {
      toast({ title: "Gagal memperbarui transaksi", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto w-full">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6 shrink-0" /> Transaksi
        </h1>

        {!loading && transactions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Transaksi</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-label={filterOpen ? "Sembunyikan filter" : "Tampilkan filter"}
                  title={filterOpen ? "Sembunyikan filter" : "Tampilkan filter"}
                  className="shrink-0 gap-1.5 h-9 px-2"
                >
                  <Filter className="h-4 w-4" />
                  {filterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              {filterOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full min-h-11">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                      <SelectItem value="failed">Gagal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPayment} onValueChange={setFilterPayment}>
                    <SelectTrigger className="w-full min-h-11">
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
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Tanggal</label>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      aria-label="Filter berdasarkan tanggal"
                      className="w-full min-h-11 text-foreground"
                    />
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>
        )}

        {loading ? (
          <p className="text-muted-foreground">Memuat...</p>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Belum ada pesanan.
            </CardContent>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Tidak ada transaksi sesuai filter.
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((tx) => {
            const status = statusConfig[tx.status] ?? { label: tx.status, className: "" };
            return (
              <Card key={tx.id} className="cursor-pointer touch-manipulation" onClick={() => toggleExpand(tx.id)}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 p-4 sm:p-6">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-base">
                      {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant="outline" className={`gap-1 text-xs ${status.className}`}>
                        {tx.status === "pending" ? <Clock className="h-3 w-3 shrink-0" /> : tx.status === "failed" ? <XCircle className="h-3 w-3 shrink-0" /> : <CheckCircle className="h-3 w-3 shrink-0" />}
                        {status.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {paymentLabel[tx.payment_method] ?? tx.payment_method}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span className="font-semibold text-sm sm:text-base">{formatRupiah(tx.total)}</span>
                    {expandedId === tx.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </CardHeader>
                {expandedId === tx.id && (
                  <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6" onClick={(e) => e.stopPropagation()}>
                    {!tx.items ? (
                      <p className="text-sm text-muted-foreground">Memuat detail...</p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {tx.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                          >
                            <span className="mr-3">
                              {item.menu_item_name} × {item.quantity}
                            </span>
                            <span className="font-medium">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {tx.status === "failed" && tx.failure_reason && (
                      <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-sm font-medium text-destructive">Alasan gagal:</p>
                        <p className="text-sm text-muted-foreground mt-1">{tx.failure_reason}</p>
                      </div>
                    )}
                    {tx.status === "pending" && (
                      <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <Button
                          className="flex-1 w-full touch-manipulation min-h-12 sm:min-h-10 text-base sm:text-sm font-medium px-4"
                          size="lg"
                          disabled={processingId === tx.id}
                          onClick={() => handleComplete(tx.id)}
                        >
                          <CheckCircle className="h-5 w-5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                          {processingId === tx.id ? "Memproses..." : "Transaksi Selesai"}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 w-full touch-manipulation min-h-12 sm:min-h-10 text-base sm:text-sm font-medium px-4"
                          size="lg"
                          disabled={processingId === tx.id}
                          onClick={() => {
                            setFailingId(failingId === tx.id ? null : tx.id);
                            setFailureReason("");
                          }}
                        >
                          <XCircle className="h-5 w-5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                          Transaksi Gagal
                        </Button>
                      </div>
                    )}
                    {failingId === tx.id && tx.status === "pending" && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          placeholder="Masukkan alasan kegagalan transaksi..."
                          value={failureReason}
                          onChange={(e) => setFailureReason(e.target.value)}
                          rows={3}
                        />
                        <Button
                          variant="destructive"
                          className="w-full"
                          disabled={processingId === tx.id || !failureReason.trim()}
                          onClick={() => handleFailed(tx.id)}
                        >
                          {processingId === tx.id ? "Memproses..." : "Konfirmasi Gagal"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
