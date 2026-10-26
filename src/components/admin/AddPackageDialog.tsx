"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createPackageAdmin } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ServiceSearch } from "./ServiceSearch";

type CategoryOption = { id: string; name: string; parentName?: string | null };
type ServiceOption = { id: string; name: string; categoryName: string };

export function AddPackageDialog({
  categories,
  defaultCategoryId,
}: {
  categories: CategoryOption[];
  services?: ServiceOption[]; // artık kullanılmıyor, geriye dönük uyumluluk için
  defaultCategoryId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await createPackageAdmin(formData);
      toast.success("Paket basariyla eklendi.");
      setOpen(false);
    } catch {
      toast.error("Paket eklenirken hata olustu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus size={16} /> Yeni Paket Ekle
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Yeni Paket Olustur</DialogTitle>
          <DialogDescription>
            Musterilere gosterilecek paketi yapilandirin ve bir servis atayarak siparis akisini baglatin.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paket Adi</label>
              <input
                name="name"
                required
                placeholder="1000 Instagram Takipci"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Miktar</label>
              <input
                name="quantity"
                type="number"
                min="1"
                required
                placeholder="1000"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Aciklama (opsiyonel)</label>
            <input
              name="description"
              placeholder="Yuksek kalite, hizli teslimat..."
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fiyat (TL)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="25.00"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Perakende (TL)</label>
              <input
                name="retailPrice"
                type="number"
                step="0.01"
                placeholder="30.00"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bayi (TL)</label>
              <input
                name="resellerPrice"
                type="number"
                step="0.01"
                placeholder="22.00"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <select
                name="categoryId"
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={defaultCategoryId ?? ""}
              >
                <option value="" disabled>Kategori secin</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} > ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Baglanacak Servis</label>
              <ServiceSearch name="serviceId" />
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            Paket satin alindiqinda secilen servis uzerinden saglayiciya otomatik siparis gonderilir.
          </div>

          <label className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            <input type="checkbox" name="showOnHomepage" className="size-4" />
            <span>
              <span className="block font-medium">Anasayfada goster</span>
              <span className="block text-muted-foreground">Seçiliyse bu paket ana sayfadaki vitrin alanında öne çıkarılır.</span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Vazgec
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" size={16} /> : null}
              {pending ? "Ekleniyor..." : "Paket Olustur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

