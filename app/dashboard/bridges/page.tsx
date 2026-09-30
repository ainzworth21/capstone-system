import { getSessionUser } from "@/lib/session";
import { readDB } from "@/lib/db";
import { Bridge } from "@/lib/types";
import { redirect } from "next/navigation";
import BridgeList from "./BridgeList";

export default async function BridgesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  const bridges = readDB<Bridge>("bridges").sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Bridge Programs</h2>
          <p className="text-muted">Manage partner collaborations and their dedicated seminars, webinars, and reports.</p>
        </div>
      </div>
      <BridgeList initialBridges={bridges} />
    </div>
  );
}
