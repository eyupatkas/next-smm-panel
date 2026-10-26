import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveResellerApplication, rejectResellerApplication } from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Users } from "lucide-react";

function statusBadge(status: string) {
  if (status === "APPROVED") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Onaylandı</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Reddedildi</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Beklemede</Badge>;
}

export default async function ResellerApplicationsPage() {
  const applications = await db.resellerApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      },
    },
  });

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bayi Başvuruları</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Kullanıcıların bayi olmak için yaptığı başvuruları onaylayın veya reddedin.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Clock size={16} className="text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">{pendingCount} beklemede</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Toplam", value: applications.length, icon: Users, color: "text-primary" },
          { label: "Beklemede", value: pendingCount, icon: Clock, color: "text-amber-400" },
          { label: "Onaylanan", value: applications.filter((a) => a.status === "APPROVED").length, icon: CheckCircle2, color: "text-emerald-400" },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon size={20} className={stat.color} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle>Başvuru Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Henüz başvuru yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Şirket / Website</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{app.user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{app.user.email}</p>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">{app.user.role.toLowerCase()}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {app.company && <p className="font-medium">{app.company}</p>}
                        {app.website && (
                          <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block max-w-32">
                            {app.website}
                          </a>
                        )}
                        {!app.company && !app.website && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-48 truncate">{app.message || "—"}</p>
                      {app.adminNote && (
                        <p className="text-xs text-primary/70 mt-1">Not: {app.adminNote}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(app.createdAt).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>{statusBadge(app.status)}</TableCell>
                    <TableCell className="text-right">
                      {app.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <form action={approveResellerApplication}>
                            <input type="hidden" name="applicationId" value={app.id} />
                            <input type="hidden" name="userId" value={app.user.id} />
                            <Button type="submit" size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                              <CheckCircle2 size={14} /> Onayla
                            </Button>
                          </form>
                          <form action={rejectResellerApplication}>
                            <input type="hidden" name="applicationId" value={app.id} />
                            <Button type="submit" size="sm" variant="destructive" className="gap-1">
                              <XCircle size={14} /> Reddet
                            </Button>
                          </form>
                        </div>
                      )}
                      {app.status !== "PENDING" && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
