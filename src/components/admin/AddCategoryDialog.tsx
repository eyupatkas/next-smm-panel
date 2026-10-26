"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createCategoryAdmin } from "@/lib/actions/admin-actions";
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

type ParentOption = { id: string; name: string };

export function AddCategoryDialog({ parents }: { parents: ParentOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await createCategoryAdmin(formData);
      toast.success("Kategori basariyla eklendi.");
      setOpen(false);
    } catch {
      toast.error("Kategori eklenirken hata olustu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Plus size={16} /> Kategori Ekle
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Kategori</DialogTitle>
          <DialogDescription>
            Ust kategori secerseniz alt kategori olarak olusturulur (orn: Instagram &gt; Takipci).
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Kategori Adi</label>
            <input
              name="name"
              required
              placeholder="Instagram veya Takipci"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ust Kategori (opsiyonel)</label>
            <select
              name="parentId"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Ana kategori (ust duzey)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ikon (opsiyonel)</label>
            <input
              name="icon"
              placeholder="instagram, youtube, tiktok..."
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Vazgec
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" size={16} /> : null}
              {pending ? "Ekleniyor..." : "Kategori Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
