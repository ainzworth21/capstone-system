import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import Navbar from "@/components/Navbar";
import SpeakerSidebar from "@/components/SpeakerSidebar";

export default async function SpeakerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login/speaker");
  // Speakers use email magic-link; skip password-change gate
  if (user.role === "admin") redirect("/dashboard");
  if (user.role !== "organizer") redirect("/student/dashboard");

  return (
    <>
      <Navbar user={user} />
      <div className="page-wrapper">
        <SpeakerSidebar user={user} />
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
