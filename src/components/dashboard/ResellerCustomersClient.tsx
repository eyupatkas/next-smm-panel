"use client";

import { useState, useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addResellerCustomer, addFundsToCustomer, updateResellerCustomer } from "@/lib/actions/dashboard-actions";
import { UserPlus, Wallet, Edit2, Users } from "lucide-react";

type CustomerData = {
  id: string;
  name: string | null;
  email: string | null;
  balance: number;
  spent: number;
};

type Props = {
  customers: CustomerData[];
  formatPrice: (amount: number) => string;
  translations: {
    title: string;
    subtitle: string;
    linkedCustomers: string;
    accounts: string;
    noCustomers: string;
    customer: string;
    email: string;
    balance: string;
    totalSpent: string;
    unnamed: string;
    addCustomer: string;
    addFunds: string;
    edit: string;
    actions: string;
    name: string;
    password: string;
    amount: string;
    save: string;
    newPassword: string;
    optional: string;
  };
};

export function ResellerCustomersClient({ customers, formatPrice, translations: t }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [fundsCustomer, setFundsCustomer] = useState<CustomerData | null>(null);
  const [editCustomer, setEditCustomer] = useState<CustomerData | null>(null);

  const [addState, addAction, addPending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await addResellerCustomer(formData);
      if (result.success) setAddOpen(false);
      return result;
    },
    {},
  );

  const [fundsState, fundsAction, fundsPending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await addFundsToCustomer(formData);
      if (result.success) setFundsCustomer(null);
      return result;
    },
    {},
  );

  const [editState, editAction, editPending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await updateResellerCustomer(formData);
      if (result.success) setEditCustomer(null);
      return result;
    },
    {},
  );

  const totalBalance = customers.reduce((s, c) => s + c.balance, 0);
  const totalSpent = customers.reduce((s, c) => s + c.spent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t.subtitle}</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <UserPlus size={16} /> {t.addCustomer}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.addCustomer}</DialogTitle>
              </DialogHeader>
              <form action={addAction} className="space-y-4">
                {addState.error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{addState.error}</p>}
                <div className="space-y-2">
                  <Label>{t.name}</Label>
                  <Input name="name" required />
                </div>
                <div className="space-y-2">
                  <Label>{t.email}</Label>
                  <Input name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>{t.password}</Label>
                  <Input name="password" type="password" minLength={6} required />
                </div>
                <Button type="submit" className="w-full" disabled={addPending}>
                  {addPending ? "..." : t.addCustomer}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Users size={20} className="text-primary" /></div>
            <div><p className="text-2xl font-bold">{customers.length}</p><p className="text-xs text-muted-foreground">{t.accounts}</p></div>
          </CardContent>
        </Card>
        <Card className="border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2"><Wallet size={20} className="text-emerald-500" /></div>
            <div><p className="text-2xl font-bold">{formatPrice(totalBalance)}</p><p className="text-xs text-muted-foreground">{t.balance}</p></div>
          </CardContent>
        </Card>
        <Card className="border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2"><Wallet size={20} className="text-blue-500" /></div>
            <div><p className="text-2xl font-bold">{formatPrice(totalSpent)}</p><p className="text-xs text-muted-foreground">{t.totalSpent}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t.linkedCustomers}
            <Badge variant="secondary">{customers.length} {t.accounts}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t.noCustomers}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.customer}</TableHead>
                  <TableHead>{t.email}</TableHead>
                  <TableHead className="text-right">{t.balance}</TableHead>
                  <TableHead className="text-right">{t.totalSpent}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name || t.unnamed}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "-"}</TableCell>
                    <TableCell className="text-right">{formatPrice(c.balance)}</TableCell>
                    <TableCell className="text-right">{formatPrice(c.spent)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setFundsCustomer(c)}
                        >
                          <Wallet size={14} /> {t.addFunds}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setEditCustomer(c)}
                        >
                          <Edit2 size={14} /> {t.edit}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Funds Dialog */}
      <Dialog open={!!fundsCustomer} onOpenChange={(open) => { if (!open) setFundsCustomer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addFunds} — {fundsCustomer?.name}</DialogTitle>
          </DialogHeader>
          <form action={fundsAction} className="space-y-4">
            <input type="hidden" name="customerId" value={fundsCustomer?.id || ""} />
            {fundsState.error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{fundsState.error}</p>}
            {fundsState.success && <p className="text-sm text-emerald-500 bg-emerald-500/10 p-2 rounded">{fundsState.success}</p>}
            <div className="space-y-2">
              <Label>{t.amount} (₺)</Label>
              <Input name="amount" type="number" min={1} step="0.01" required />
            </div>
            <Button type="submit" className="w-full" disabled={fundsPending}>
              {fundsPending ? "..." : t.addFunds}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={(open) => { if (!open) setEditCustomer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.edit} — {editCustomer?.email}</DialogTitle>
          </DialogHeader>
          <form action={editAction} className="space-y-4">
            <input type="hidden" name="customerId" value={editCustomer?.id || ""} />
            {editState.error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{editState.error}</p>}
            <div className="space-y-2">
              <Label>{t.name}</Label>
              <Input name="name" defaultValue={editCustomer?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label>{t.newPassword} ({t.optional})</Label>
              <Input name="newPassword" type="password" minLength={6} placeholder="••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={editPending}>
              {editPending ? "..." : t.save}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
