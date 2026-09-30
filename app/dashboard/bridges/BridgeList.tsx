"use client";
import { useState } from "react";
import Link from "next/link";
import { Bridge } from "@/lib/types";

export default function BridgeList({ initialBridges }: { initialBridges: Bridge[] }) {
  const [bridges, setBridges] = useState(initialBridges);
  const [title, setTitle] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  const visibleBridges = bridges.filter((bridge) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query ||
      bridge.title.toLowerCase().includes(query) ||
      bridge.partner_name.toLowerCase().includes(query);
    const active = bridge.is_active !== false;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && active) ||
      (statusFilter === "archived" && !active);
    return matchesSearch && matchesStatus;
  });

  async function createBridge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/bridges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, partner_name: partnerName }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not create bridge.");
      return;
    }
    setBridges((current) => [...current, data].sort((a, b) => a.title.localeCompare(b.title)));
    setTitle("");
    setPartnerName("");
  }

  async function toggleBridge(bridge: Bridge) {
    setUpdatingId(bridge.id);
    setError("");
    const response = await fetch("/api/bridges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bridge.id, is_active: bridge.is_active === false }),
    });
    const data = await response.json();
    setUpdatingId("");
    if (!response.ok) {
      setError(data.error || "Could not update bridge status.");
      return;
    }
    setBridges((current) => current.map((item) => item.id === data.id ? data : item));
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section className="card">
        <div className="card-header"><h3 style={{ margin: 0 }}>Create Bridge</h3></div>
        <form className="card-body" onSubmit={createBridge} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", alignItems: "end", gap: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="bridge-title">Bridge title</label>
            <input id="bridge-title" className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bridge 1 - IT E-commerce" required maxLength={120} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="bridge-partner">Collaborating university</label>
            <input id="bridge-partner" className="form-control" value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="CvSU & UiTM Collaboration" required maxLength={160} />
          </div>
          <button className="btn btn-gold" type="submit" disabled={saving}>{saving ? "Creating..." : "Create Bridge"}</button>
          {error && <p className="alert alert-error" style={{ gridColumn: "1 / -1", margin: 0 }}>{error}</p>}
        </form>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".75rem", marginBottom: ".75rem" }}>
          <h3 style={{ margin: 0 }}>Bridge Programs</h3>
          <span className="text-muted" style={{ fontSize: ".875rem" }}>
            {visibleBridges.length} of {bridges.length} bridge{bridges.length === 1 ? "" : "s"}
          </span>
        </div>
        {bridges.length === 0 ? (
          <div className="card"><div className="card-body text-muted">No bridge programs created yet.</div></div>
        ) : (
          <>
            <form className="filter-bar" onSubmit={(event) => event.preventDefault()} style={{ marginBottom: "1rem" }}>
              <input
                className="form-control"
                type="search"
                aria-label="Search Bridges"
                placeholder="Search bridge title or university..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="form-control"
                aria-label="Filter Bridges by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              >
                <option value="all">All Bridges</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              {(search || statusFilter !== "all") && (
                <button type="button" className="btn btn-secondary" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                  Clear
                </button>
              )}
            </form>
            {visibleBridges.length === 0 ? (
              <div className="card"><div className="card-body text-muted">No Bridges match these filters.</div></div>
            ) : (
              <div style={{ display: "grid", gap: ".75rem" }}>
            {visibleBridges.map((bridge) => (
              <article key={bridge.id} className="card">
                <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <Link href={`/dashboard/bridges/${bridge.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                      <h4 style={{ margin: "0 0 .25rem" }}>{bridge.title}</h4>
                    </Link>
                    <p className="text-muted" style={{ margin: 0 }}>{bridge.partner_name}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap" }}>
                    <span className={`badge ${bridge.is_active === false ? "badge-cancelled" : "badge-approved"}`}>
                      {bridge.is_active === false ? "Off · Archived" : "On · Open"}
                    </span>
                    <Link href={`/dashboard/bridges/${bridge.id}`} className="btn btn-secondary btn-sm">Open Bridge</Link>
                    <button type="button" className={bridge.is_active === false ? "btn btn-gold btn-sm" : "btn btn-secondary btn-sm"} onClick={() => toggleBridge(bridge)} disabled={updatingId === bridge.id}>
                      {updatingId === bridge.id ? "Saving..." : bridge.is_active === false ? "Turn On" : "Turn Off"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
