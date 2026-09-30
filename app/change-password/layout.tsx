import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
