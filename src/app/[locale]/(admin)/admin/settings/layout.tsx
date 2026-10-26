import { SettingsSidebar } from "@/components/admin/SettingsSidebar";

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr] lg:gap-6">
      <SettingsSidebar />

      <section>{children}</section>
    </div>
  );
}

