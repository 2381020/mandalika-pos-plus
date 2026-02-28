import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/lib/formatCurrency";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingBag, LogOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function Pesan() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: menuItems } = useQuery({
    queryKey: ["menu-items"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && paidNum < total) {
      toast({ title: "Jumlah bayar kurang", variant: "destructive" });
      return;
    }
    setProcessing(true);

    try {
      const { data: tx, error } = await supabase
        .from("transactions")
        .insert({
          cashier_id: user!.id,
          total,
          payment_method: paymentMethod,
          amount_paid: paymentMethod === "cash" ? paidNum : total,
          change_amount: change,
          is_synced: true,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("transaction_items").insert(
        cart.map((c) => ({
          transaction_id: tx.id,
          menu_item_id: c.menu_item_id,
          menu_item_name: c.name,
          quantity: c.quantity,
          price: c.price,
          subtotal: c.price * c.quantity,
        }))
      );

      toast({ title: "Pesanan berhasil!", description: `Total: ${formatRupiah(total)}` });
      setCart([]);
      setAmountPaid("");
    } catch (err: any) {
      toast({ title: "Gagal menyimpan pesanan", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
              M
            </div>
            <h1 className="text-lg font-bold">Restoran Mandalika</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Menu Grid */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Menu</h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari menu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="mb-3 h-32 w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    )}
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-primary font-bold mt-1">{formatRupiah(item.price)}</p>
                  </CardContent>
                </Card>
              ))}
              {filteredItems.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8">Tidak ada menu ditemukan</p>
              )}
            </div>
          </div>

          {/* Cart */}
          <Card className="flex flex-col overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5" />
                Pesanan ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada pesanan</p>
              ) : (
                <div className="space-y-3 flex-1">
                  {cart.map((item) => (
                    <div key={item.menu_item_id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatRupiah(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.menu_item_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.menu_item_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-semibold w-20 text-right">{formatRupiah(item.price * item.quantity)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.menu_item_id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 space-y-3 mt-auto">
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
                        <span className="font-semibold text-accent">{formatRupiah(change)}</span>
                      </div>
                    )}
                  </>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={cart.length === 0 || processing}
                  onClick={handleCheckout}
                >
                  {processing ? "Memproses..." : "Pesan & Bayar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
