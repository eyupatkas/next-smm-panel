import { db } from "@/lib/db";
import {
  createAnnouncementAdmin,
  deleteAnnouncementAdmin,
  updateAnnouncementAdmin,
} from "@/lib/actions/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default async function AdminAnnouncementsPage() {
  const announcements = await db.announcement.findMany({
    orderBy: [
      { pinned: "desc" },
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-xl">
        <CardHeader>
          <CardTitle>Duyuru Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAnnouncementAdmin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-title">Baslik</Label>
              <Input id="new-title" name="title" placeholder="Orn: Yeni kampanya aktif" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-content">Icerik</Label>
              <textarea
                id="new-content"
                name="content"
                placeholder="Duyuru metnini yazin..."
                className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="new-sortOrder">Siralama</Label>
                <Input id="new-sortOrder" name="sortOrder" type="number" defaultValue={0} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Label htmlFor="new-active">Aktif</Label>
                <input id="new-active" name="active" type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Label htmlFor="new-pinned">Uste sabitle</Label>
                <input id="new-pinned" name="pinned" type="checkbox" className="h-4 w-4" />
              </div>
            </div>

            <div>
              <Button type="submit">Duyuru Ekle</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-xl">
        <CardHeader>
          <CardTitle>Mevcut Duyurular ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henuz duyuru eklenmedi.</p>
          ) : (
            announcements.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <form action={updateAnnouncementAdmin} className="grid gap-3">
                  <input type="hidden" name="id" value={item.id} />

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Aktif" : "Pasif"}
                    </Badge>
                    {item.pinned ? <Badge variant="outline">Sabit</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {item.createdAt.toLocaleString("tr-TR")}
                    </span>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`title-${item.id}`}>Baslik</Label>
                    <Input id={`title-${item.id}`} name="title" defaultValue={item.title} required />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`content-${item.id}`}>Icerik</Label>
                    <textarea
                      id={`content-${item.id}`}
                      name="content"
                      defaultValue={item.content}
                      className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`sort-${item.id}`}>Siralama</Label>
                      <Input id={`sort-${item.id}`} name="sortOrder" type="number" defaultValue={item.sortOrder} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3 py-2">
                      <Label htmlFor={`active-${item.id}`}>Aktif</Label>
                      <input id={`active-${item.id}`} name="active" type="checkbox" defaultChecked={item.active} className="h-4 w-4" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3 py-2">
                      <Label htmlFor={`pinned-${item.id}`}>Uste sabitle</Label>
                      <input id={`pinned-${item.id}`} name="pinned" type="checkbox" defaultChecked={item.pinned} className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="submit">Kaydet</Button>
                  </div>
                </form>

                <form action={deleteAnnouncementAdmin} className="mt-3">
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Sil
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
