import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/formatCurrency";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, UtensilsCrossed } from "lucide-react";

interface MenuFormData {
  name: string;
  category_id: string;
  price: string;
  description: string;
  is_active: boolean;
  image_url: string;
}

const emptyForm: MenuFormData = {
  name: "",
  category_id: "",
  price: "",
  description: "",
  is_active: true,
  image_url: "",
};

export default function ManajemenMenu() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormData>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["menu-items-all"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*, menu_categories(name)").order("name");
      return data ?? [];
    },
  });

  const filtered = (menuItems ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        category_id: form.category_id || null,
        price: parseInt(form.price) || 0,
        description: form.description || null,
        is_active: form.is_active,
        image_url: form.image_url || null,
      };

      if (editId) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items-all"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditId(null);
      toast({ title: editId ? "Menu diperbarui" : "Menu ditambahkan" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items-all"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: "Menu dihapus" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items-all"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file);
    if (error) {
      toast({ title: "Upload gagal", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    setUploading(false);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      category_id: item.category_id ?? "",
      price: String(item.price),
      description: item.description ?? "",
      is_active: item.is_active,
      image_url: item.image_url ?? "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Manajemen Menu</h1>
            <p className="text-sm text-muted-foreground">{(menuItems ?? []).length} item menu</p>
          </div>
          <Button onClick={openNew} className="gap-2 w-full sm:w-auto shrink-0">
            <Plus className="h-4 w-4 shrink-0" />
            Tambah Menu
          </Button>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari menu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className={!item.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="mb-3 h-36 w-full rounded-lg object-cover" loading="lazy" />
                )}
                {!item.image_url && (
                  <div className="mb-3 flex h-36 w-full items-center justify-center rounded-lg bg-muted">
                    <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">{(item as any).menu_categories?.name ?? "—"}</p>
                    <p className="text-primary font-bold mt-1">{formatRupiah(item.price)}</p>
                  </div>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: item.id, is_active: checked })}
                  />
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="flex-1 min-w-[80px]" onClick={() => openEdit(item)}>
                    <Pencil className="mr-1 h-3 w-3 shrink-0" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Menu" : "Tambah Menu Baru"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nama Menu</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Harga (Rp)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Foto Menu</Label>
                <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
                {form.image_url && <img src={form.image_url} alt="Preview" className="h-24 rounded-lg object-cover" />}
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
