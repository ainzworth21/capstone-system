import { redirect } from "next/navigation";

/** Legacy path — speakers now use the native /speaker portal. */
export default function LegacyStudentHostedRedirect() {
  redirect("/speaker/hosted");
}
