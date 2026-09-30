import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import AdminSidebar from "@/components/AdminSidebar";
import { requireAdmin } from "@/lib/speaker-portal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  requireAdmin(user);
  if (user!.must_change_password) redirect("/change-password");

  return (
    <>
      <div className="page-wrapper">
        <AdminSidebar user={user!} />
        <main className="main-content admin-main-col">{children}</main>
      </div>
      <footer className="footer">
        <p>© {new Date().getFullYear()} CvSU Campus Event Management System</p>
      </footer>
    </>
  );
}
