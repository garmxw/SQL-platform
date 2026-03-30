import Navbar from "@/components/Navbar";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";

// app/admin/dashboard/layout.tsx
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coockieStore = await cookies();
  const defaultOpen = coockieStore.get("sidebar_state")?.value === "true";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <main className="w-full">
        <Navbar />

        <div className="px-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}
