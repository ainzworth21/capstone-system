import { redirect } from "next/navigation";

/** Legacy magic-link URL — speakers now sign in with email only. */
export default function SpeakerLoginVerifyRedirect() {
  redirect("/login/speaker");
}
