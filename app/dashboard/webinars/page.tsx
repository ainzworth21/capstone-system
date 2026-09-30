import { redirect } from "next/navigation";

export default async function WebinarsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.category) q.set("category", sp.category);
  if (sp.search) q.set("search", sp.search);
  if (sp.edit) q.set("edit", sp.edit);
  q.set("type", "webinar");
  const qs = q.toString();
  redirect(`/dashboard/events${qs ? `?${qs}` : ""}`);
}
