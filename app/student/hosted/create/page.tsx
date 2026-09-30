import { redirect } from "next/navigation";

export default function LegacyStudentHostedCreateRedirect() {
  redirect("/speaker/hosted/create");
}
