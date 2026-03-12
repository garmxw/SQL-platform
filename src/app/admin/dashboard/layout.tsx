import Navbar from "@/components/Navbar";
import AppSidebar from "@/components/AppSidebar";

// app/admin/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppSidebar />
      <main className="w-full">
        <Navbar />
        <div className="px-4">{children}</div>
      </main>
    </>
  );
}
