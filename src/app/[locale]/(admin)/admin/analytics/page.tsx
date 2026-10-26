import type { Metadata } from "next";
import AdminAnalyticsClient from "@/components/admin/AdminAnalyticsClient";

export const metadata: Metadata = {
  title: "Analitik | Admin",
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
