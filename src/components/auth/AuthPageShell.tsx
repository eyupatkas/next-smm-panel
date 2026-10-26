import { BrandMark } from "@/components/shared/BrandMark";
import Link from "next/link";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthPageShell({ title, subtitle, children }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-12 left-1/4 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex justify-center">
            <BrandMark centered size="lg" showTagline />
          </Link>
          <h1 className="mt-6 text-3xl font-bold font-display text-foreground">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  );
}