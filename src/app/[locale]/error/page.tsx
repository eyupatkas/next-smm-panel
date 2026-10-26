import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-lg border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle>Bir hata olustu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Giris veya islem sirasinda bir sorun olusmus olabilir. Lutfen tekrar deneyin.
          </p>
          <div className="flex gap-3">
            <Link href="/login">
              <Button>Giris Sayfasina Don</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Ana Sayfa</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

