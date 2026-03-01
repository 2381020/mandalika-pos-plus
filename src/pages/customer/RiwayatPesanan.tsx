import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/formatCurrency";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Receipt, ChevronDown, ChevronUp } from "lucide-react";

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
  created_at: string;
  items?: TransactionItem[];
}

export default function RiwayatPesanan() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, total, payment_method, created_at")
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

  const paymentLabel: Record<string, string> = {
    cash: "Tunai",
    qris: "QRIS",
    debit: "Debit",
    credit: "Kredit",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" /> Riwayat Pesanan
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
          transactions.map((tx) => (
            <Card
              key={tx.id}
              className="cursor-pointer"
              onClick={() => toggleExpand(tx.id)}
            >
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {paymentLabel[tx.payment_method] ?? tx.payment_method}
                  </Badge>
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
                <CardContent className="pt-0">
                  {!tx.items ? (
                    <p className="text-sm text-muted-foreground">Memuat detail...</p>
                  ) : (
                    <ul className="divide-y">
                      {tx.items.map((item) => (
                        <li key={item.id} className="flex justify-between py-2 text-sm">
                          <span>
                            {item.menu_item_name} × {item.quantity}
                          </span>
                          <span className="text-muted-foreground">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
