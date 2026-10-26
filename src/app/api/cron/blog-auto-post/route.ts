import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runAutoBlogPost } from "@/lib/services/blog-ai";

function isAuthorizedBySecret(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = req.headers.get("x-cron-key");
  return Boolean(provided && expected === provided);
}

export async function GET(req: Request) {
  if (!isAuthorizedBySecret(req)) {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runAutoBlogPost();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Hata" },
      { status: 500 }
    );
  }
}

export { GET as POST };
