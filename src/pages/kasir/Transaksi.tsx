import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMenuItems, useCategories } from "@/hooks/useMenuData";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { formatRupiah } from "@/lib/formatCurrency";
import { saveOfflineTransaction } from "@/lib/offlineDb";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function Transaksi() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: categories } = useCategories();
  const { data: menuItems } = useMenuItems();

  const filteredItems = useMemo(() => {
    return (menuItems ?? []).filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || item.category_id === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [menuItems, search, categoryFilter]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const paidNum = parseInt(amountPaid) || 0;
  const change = paymentMethod === "cash" ? Math.max(0, paidNum - total) : 0;

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menu_item_id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.menu_item_id !== id));
  };

  const handleBuatPesanan = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && paidNum < total) {
      toast({ title: "Jumlah bayar kurang", variant: "destructive" });
      return;
    }
    setProcessing(true);

    const txData = {
      cashier_id: user!.id,
      total,
      payment_method: paymentMethod,
      amount_paid: paymentMethod === "cash" ? paidNum : total,
      change_amount: change,
      items: cart.map((c) => ({
        menu_item_id: c.menu_item_id,
        menu_item_name: c.name,
        quantity: c.quantity,
        price: c.price,
        subtotal: c.price * c.quantity,
      })),
    };

    try {
      if (isOnline) {
        const { data: tx, error } = await supabase
          .from("transactions")
          .insert({
            cashier_id: txData.cashier_id,
            total: txData.total,
            payment_method: txData.payment_method,
            amount_paid: txData.amount_paid,
            change_amount: txData.change_amount,
            is_synced: true,
            status: "pending",
          })
          .select()
          .single();
        if (error) throw error;

        await supabase.from("transaction_items").insert(
          txData.items.map((item) => ({ ...item, transaction_id: tx.id }))
        );

        setCart([]);
        setAmountPaid("");
        toast({ title: "Pesanan dibuat", description: "Lihat detail di menu Transaksi" });
        navigate("/riwayat");
      } else {
        const offlineId = crypto.randomUUID();
        await saveOfflineTransaction({
          ...txData,
          status: "pending",
          offline_id: offlineId,
          created_at: new Date().toISOString(),
        });
        setCart([]);
        setAmountPaid("");
        toast({ title: "Pesanan disimpan offline", description: "Lihat detail di menu Transaksi" });
        navigate("/riwayat");
      }
    } catch (err: any) {
      toast({ title: "Gagal membuat pesanan", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] lg:gap-6 lg:min-h-[calc(100vh-6rem)] pb-20 md:pb-0">
        {/* Menu Grid */}
        <div className="space-y-4 min-h-0 overflow-y-auto pr-0 lg:pr-2">
          <h1 className="text-xl sm:text-2xl font-bold">Transaksi Baru</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40 min-w-0">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all border touch-manipulation"
                onClick={() => addToCart(item)}
              >
                <CardContent className="p-3 sm:p-4">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="mb-2 sm:mb-3 h-24 sm:h-32 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  )}
                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-2">{item.name}</h3>
                  <p className="text-primary font-bold mt-1 text-xs sm:text-base">{formatRupiah(item.price)}</p>
                </CardContent>
              </Card>
            ))}
            {filteredItems.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">Tidak ada menu ditemukan</p>
            )}
          </div>
        </div>

        {/* Cart */}
        <Card className="flex flex-col overflow-hidden flex-shrink-0 lg:max-h-[calc(100vh-8rem)]">
          <CardHeader className="pb-3 py-3 sm:py-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingBag className="h-5 w-5 shrink-0" />
              Keranjang ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">Keranjang kosong</p>
            ) : (
              <div className="space-y-2 sm:space-y-3 flex-1">
                {cart.map((item) => (
                  <div key={item.menu_item_id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 rounded-lg bg-muted/50 p-2.5 sm:p-3">
                    <div className="flex-1 min-w-0 w-full sm:w-auto order-1">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatRupiah(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 order-2 shrink-0">
                      <Button variant="outline" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 touch-manipulation" onClick={(e) => { e.stopPropagation(); updateQty(item.menu_item_id, -1); }}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 touch-manipulation" onClick={(e) => { e.stopPropagation(); updateQty(item.menu_item_id, 1); }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold sm:w-20 text-right order-3 w-full sm:w-auto flex justify-end">{formatRupiah(item.price * item.quantity)}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 text-destructive shrink-0 order-4 touch-manipulation" onClick={(e) => { e.stopPropagation(); removeItem(item.menu_item_id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-3 mt-auto shrink-0">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(total)}</span>
              </div>

              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>

              {paymentMethod === "cash" && (
                <>
                  <Input
                    type="number"
                    placeholder="Jumlah bayar"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                  {paidNum > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kembalian</span>
                      <span className="font-semibold text-primary">{formatRupiah(change)}</span>
                    </div>
                  )}
                </>
              )}

              {!isOnline && (
                <Badge variant="outline" className="w-full justify-center border-destructive text-destructive">
                  Mode Offline — transaksi disimpan lokal
                </Badge>
              )}

              <Button
                className="w-full touch-manipulation"
                size="lg"
                disabled={cart.length === 0 || processing}
                onClick={handleBuatPesanan}
              >
                {processing ? "Memproses..." : "Buat Pesanan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mobile: sticky bottom bar untuk cepat checkout */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t bg-background/95 backdrop-blur supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] p-3 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-primary">{formatRupiah(total)}</p>
              </div>
              <Button
                className="shrink-0 touch-manipulation min-h-11 px-6"
                size="lg"
                disabled={processing}
                onClick={handleBuatPesanan}
              >
                {processing ? "Memproses..." : "Buat Pesanan"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
