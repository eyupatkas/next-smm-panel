import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Giriş ve Kayıt | OptiSMM",
    template: "%s | OptiSMM",
  },
  description: "OptiSMM hesabınıza giriş yapın veya yeni hesap oluşturun.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}