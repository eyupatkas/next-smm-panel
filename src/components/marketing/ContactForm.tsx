"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send, Ticket } from "lucide-react";
import Link from "next/link";

export function ContactForm() {
  const t = useTranslations("contact");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error(t("formError"));
      return;
    }

    setLoading(true);
    // Simulate API request
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    
    toast.success(t("formSuccess"));
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-card/40 backdrop-blur-sm shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold font-display text-white">{t("formTitle")}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground">{t("formName")}</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background/50 border-white/10 text-white placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">{t("formEmail")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-background/50 border-white/10 text-white placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-muted-foreground">{t("formSubject")}</Label>
              <Input
                id="subject"
                type="text"
                required
                placeholder="How can we help you?"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="bg-background/50 border-white/10 text-white placeholder:text-muted-foreground/50 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-muted-foreground">{t("formMessage")}</Label>
              <Textarea
                id="message"
                required
                rows={4}
                placeholder="Write your message here..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="bg-background/50 border-white/10 text-white placeholder:text-muted-foreground/50 focus-visible:ring-primary resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-sky-500 text-white hover:opacity-95 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  {t("formSubmit")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Support Ticket Quick Link */}
      <Card className="border-white/10 bg-gradient-to-br from-violet-500/5 to-transparent backdrop-blur-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
            <Ticket size={22} />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-white">{t("ticketNotice")}</p>
          </div>
          <Link
            href="/dashboard/support"
            className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors shrink-0"
          >
            {t("ticketLink")} &rarr;
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
