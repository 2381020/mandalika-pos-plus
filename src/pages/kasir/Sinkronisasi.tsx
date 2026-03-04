import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOfflineTransactions, deleteOfflineTransaction, OfflineTransaction } from "@/lib/offlineDb";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { formatRupiah } from "@/lib/formatCurrency";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle, Clock } from "lucide-react";

export default function Sinkronisasi() {
  const isOnline = useOnlineStatus();
  const [transactions, setTransactions] = useState<OfflineTransaction[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadOffline = useCallback(async () => {
    const all = await getOfflineTransactions();
    // Hanya transaksi yang sudah selesai (status completed) yang bisa disinkronkan
    setTransactions(all.filter((t) => (t.status ?? "completed") === "completed"));
  }, []);

  useEffect(() => {
    loadOffline();
  }, [loadOffline]);

  const syncAll = async () => {
    if (!isOnline || transactions.length === 0) return;
    setSyncing(true);
    let synced = 0;

    for (const tx of transactions) {
      try {
        const { data: savedTx, error } = await supabase
          .from("transactions")
          .insert({
            cashier_id: tx.cashier_id,
            total: tx.total,
            payment_method: tx.payment_method,
            amount_paid: tx.amount_paid,
            change_amount: tx.change_amount,
            is_synced: true,
            offline_id: tx.offline_id,
            created_at: tx.created_at,
            status: tx.status ?? "completed",
          })
          .select()
          .single();

        if (error) throw error;

        await supabase.from("transaction_items").insert(
          tx.items.map((item) => ({ ...item, transaction_id: savedTx.id }))
        );

        await deleteOfflineTransaction(tx.offline_id);
        synced++;
      } catch (err) {
        console.error("Sync error:", err);
      }
    }

    toast({ title: `${synced} transaksi berhasil disinkronkan` });
    await loadOffline();
    setSyncing(false);
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && transactions.length > 0) {
      syncAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Sinkronisasi</h1>
            <p className="text-sm text-muted-foreground">{transactions.length} transaksi belum tersinkron</p>
          </div>
          <Button onClick={syncAll} disabled={!isOnline || syncing || transactions.length === 0} className="gap-2 w-full sm:w-auto shrink-0">
            <RefreshCw className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Menyinkronkan..." : "Sinkronkan Semua"}
          </Button>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-success mb-3" />
              <h3 className="font-semibold text-lg">Semua Tersinkron!</h3>
              <p className="text-sm text-muted-foreground">Tidak ada transaksi offline yang perlu disinkronkan</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.offline_id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{formatRupiah(tx.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString("id-ID")} • {tx.payment_method} • {tx.items.length} item
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1 text-warning border-warning">
                    <Clock className="h-3 w-3" />
                    Belum Tersinkron
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
