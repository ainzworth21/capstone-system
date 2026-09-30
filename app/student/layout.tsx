import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import Navbar from "@/components/Navbar";
import StudentSidebar from "@/components/StudentSidebar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/change-password");
  if (user.role === "admin") redirect("/dashboard");
  if (user.role === "organizer") redirect("/speaker/dashboard");

  return (
    <>
      <Navbar user={user} />
      <div className="page-wrapper">
        <StudentSidebar user={user} />
        <main className="main-content">{children}</main>
      </div>
      <footer className="footer">
        <p>
          © {new Date().getFullYear()} CvSU Campus Event Management System
        </p>
      </footer>
    </>
  );
}
