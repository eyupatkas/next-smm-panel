"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updatePackageAdmin } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceSearch } from "./ServiceSearch";

export type EditablePkg = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  showOnHomepage: boolean;
  status: boolean;
  service: { id: string; name: string };
  category: { name: string; parent: { name: string } | null };
};

export function EditPackageDialog({
  pkg,
  open,
  onClose,
}: {
  pkg: EditablePkg;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await updatePackageAdmin(formData);
      toast.success("Paket güncellendi.");
      onClose();
    } catch {
      toast.error("Güncelleme başarısız.");
    } finally {
      setPending(false);
    }
  }

  const defaultService = {
    id: pkg.service.id,
    name: pkg.service.name,
    categoryName: pkg.category.parent?.name ?? pkg.category.name,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paketi Düzenle</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4 pt-1">
          <input type="hidden" name="id" value={pkg.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Paket Adı</label>
              <Input name="name" defaultValue={pkg.name} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Miktar</label>
              <Input name="quantity" type="number" min="1" defaultValue={pkg.quantity} required />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fiyat (₺)</label>
              <Input name="price" type="number" step="0.01" min="0.01" defaultValue={pkg.price} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Perakende (₺)</label>
              <Input name="retailPrice" type="number" step="0.01" defaultValue={pkg.retailPrice ?? ""} placeholder="—" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bayi (₺)</label>
              <Input name="resellerPrice" type="number" step="0.01" defaultValue={pkg.resellerPrice ?? ""} placeholder="—" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bağlı Servis</label>
            <p className="text-xs text-muted-foreground">Değiştirmek için aratın, değiştirmeyecekseniz olduğu gibi bırakın.</p>
            <ServiceSearch name="serviceId" defaultValue={defaultService} />
          </div>

          <div className="flex gap-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked={pkg.status} className="size-4 rounded" />
              <span>Aktif</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="showOnHomepage" defaultChecked={pkg.showOnHomepage} className="size-4 rounded" />
              <span>Anasayfada Göster</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              İptal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
