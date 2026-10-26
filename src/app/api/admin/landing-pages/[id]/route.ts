import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const page = await db.landingPage.findUnique({
      where: { id: params.id },
    });

    if (!page) {
      return NextResponse.json({ error: "Sayfa bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { slug, platform, seoTitle, seoDescription, h1, heroDescription, content, faqItems, published } = data;

    const updatedPage = await db.landingPage.update({
      where: { id: params.id },
      data: {
        slug,
        platform,
        seoTitle,
        seoDescription,
        h1,
        heroDescription,
        content,
        faqItems: faqItems ? JSON.parse(JSON.stringify(faqItems)) : [],
        published,
      },
    });

    return NextResponse.json(updatedPage);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Bu URL (slug) zaten kullanılıyor." }, { status: 400 });
    }
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    await db.landingPage.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
