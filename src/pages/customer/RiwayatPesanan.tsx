import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { updateOfflineTransactionStatus } from "@/lib/offlineDb";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/formatCurrency";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Receipt, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

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
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" /> Transaksi
        </h1>

        {loading ? (
          <p className="text-muted-foreground">Memuat...</p>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Belum ada pesanan.
            </CardContent>
          </Card>
        ) : (
          transactions.map((tx) => {
            const status = statusConfig[tx.status] ?? { label: tx.status, className: "" };
            return (
              <Card key={tx.id} className="cursor-pointer" onClick={() => toggleExpand(tx.id)}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="outline" className={`gap-1 ${status.className}`}>
                        {tx.status === "pending" ? <Clock className="h-3 w-3" /> : tx.status === "failed" ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        {status.label}
                      </Badge>
                      <Badge variant="secondary">
                        {paymentLabel[tx.payment_method] ?? tx.payment_method}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatRupiah(tx.total)}</span>
                    {expandedId === tx.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedId === tx.id && (
                  <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
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
                      <div className="flex gap-2 mt-4">
                        <Button
                          className="flex-1"
                          size="lg"
                          disabled={processingId === tx.id}
                          onClick={() => handleComplete(tx.id)}
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          {processingId === tx.id ? "Memproses..." : "Transaksi Selesai"}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          size="lg"
                          disabled={processingId === tx.id}
                          onClick={() => {
                            setFailingId(failingId === tx.id ? null : tx.id);
                            setFailureReason("");
                          }}
                        >
                          <XCircle className="h-5 w-5 mr-2" />
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
