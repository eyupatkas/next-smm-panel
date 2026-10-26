import { findAllBlogPosts } from "@/lib/blog-posts";
import { getBlogAISettings } from "@/lib/services/blog-ai";
import { db } from "@/lib/db";
import { BlogManagementClient } from "@/components/admin/BlogManagementClient";

export default async function AdminBlogPage() {
  const posts = await findAllBlogPosts();
  const aiSettings = await getBlogAISettings();

  let topics: Array<{
    id: string;
    title: string;
    used: boolean;
    usedAt: Date | null;
    createdAt: Date;
  }> = [];
  try {
    topics = await db.blogTopic.findMany({
      orderBy: [{ used: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    topics = [];
  }

  return (
    <BlogManagementClient
      posts={posts}
      topics={topics}
      aiSettings={aiSettings}
    />
  );
}
