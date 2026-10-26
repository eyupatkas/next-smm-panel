import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const pages = await db.landingPage.findMany({
      orderBy: { slug: "asc" },
    });
    return NextResponse.json(pages);
  } catch (error) {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { slug, platform, seoTitle, seoDescription, h1, heroDescription, content, faqItems, published } = data;

    if (!slug) {
      return NextResponse.json({ error: "Slug (URL) alanı zorunludur" }, { status: 400 });
    }

    const newPage = await db.landingPage.create({
      data: {
        slug,
        platform,
        seoTitle,
        seoDescription,
        h1,
        heroDescription,
        content,
        faqItems: faqItems ? JSON.parse(JSON.stringify(faqItems)) : [],
        published: published !== false,
      },
    });

    return NextResponse.json(newPage);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Bu URL (slug) zaten kullanılıyor." }, { status: 400 });
    }
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
