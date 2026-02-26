import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/formatCurrency";
import { UtensilsCrossed, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Katalog() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: menuItems } = useQuery({
    queryKey: ["menu-items-active"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*, menu_categories(name)").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return (menuItems ?? []).filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "all" || item.category_id === activeCategory;
      return matchSearch && matchCat;
    });
  }, [menuItems, search, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              M
            </div>
            <div>
              <h1 className="font-bold text-lg">Restoran Mandalika</h1>
              <p className="text-xs text-muted-foreground">Katalog Digital</p>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari menu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategory("all")}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Semua
            </button>
            {categories?.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="text-left rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-md transition-shadow"
            >
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-36 w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-36 w-full flex items-center justify-center bg-muted">
                  <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-3">
                <h3 className="font-semibold text-sm line-clamp-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground">{(item as any).menu_categories?.name}</p>
                <p className="text-primary font-bold text-sm mt-1">{formatRupiah(item.price)}</p>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UtensilsCrossed className="mx-auto h-12 w-12 mb-3" />
            <p>Tidak ada menu ditemukan</p>
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-sm">
          {selectedItem && (
            <>
              {selectedItem.image_url && (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="w-full h-56 object-cover rounded-lg -mt-2"
                />
              )}
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedItem.name}</DialogTitle>
              </DialogHeader>
              <p className="text-primary text-xl font-bold">{formatRupiah(selectedItem.price)}</p>
              {selectedItem.description && (
                <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
