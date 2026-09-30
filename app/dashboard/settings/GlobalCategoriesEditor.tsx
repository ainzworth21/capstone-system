"use client";

import { useEffect, useState } from "react";

interface ModuleTopicEntry {
  module: string;
  topics: string[];
}

export default function GlobalCategoriesEditor({
  initialCategories,
}: {
  initialCategories: string[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [moduleTopics, setModuleTopics] = useState<ModuleTopicEntry[]>([]);
  const [name, setName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/modules/topics")
      .then((res) => res.json())
      .then((data: ModuleTopicEntry[]) => {
        setModuleTopics(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0 && !selectedModule) {
          setSelectedModule(data[0].module);
        }
      })
      .catch(() => {});
  }, [selectedModule]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a module name.");
      return;
    }
    setSaving(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add module.");
      return;
    }
    const nextCategories = Array.isArray(data) ? data : [...categories, trimmed];
    setCategories(nextCategories);
    setSelectedModule(trimmed);
    setName("");
    setMsg(`“${trimmed}” added and is ready for topics.`);

    if (!moduleTopics.some((entry) => entry.module.toLowerCase() === trimmed.toLowerCase())) {
      const topicRes = await fetch("/api/modules/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: trimmed }),
      });
      if (topicRes.ok) {
        const list = await topicRes.json();
        setModuleTopics(Array.isArray(list) ? list : moduleTopics);
      }
    }
  }

  async function removeCategory(cat: string) {
    if (!confirm(`Remove module “${cat}”? Existing events keep this label.`)) {
      return;
    }
    setError("");
    setMsg("");
    const res = await fetch(`/api/categories?name=${encodeURIComponent(cat)}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not remove module.");
      return;
    }
    setCategories(Array.isArray(data) ? data : categories.filter((c) => c !== cat));
    setModuleTopics((prev) => prev.filter((entry) => entry.module.toLowerCase() !== cat.toLowerCase()));
    if (selectedModule.toLowerCase() === cat.toLowerCase()) {
      setSelectedModule("");
    }
    setMsg(`“${cat}” removed from the list.`);

    await fetch(`/api/modules/topics?module=${encodeURIComponent(cat)}`, { method: "DELETE" });
  }

  async function renameCategory(oldName: string) {
    const nextName = editedName.trim();
    if (!nextName) {
      setError("Enter a module name.");
      return;
    }
    setSaving(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldName, newName: nextName }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not rename module.");
      return;
    }
    const nextCategories = Array.isArray(data) ? data : categories.map((c) => (c === oldName ? nextName : c));
    setCategories(nextCategories);
    setModuleTopics((prev) =>
      prev.map((entry) =>
        entry.module.toLowerCase() === oldName.toLowerCase()
          ? { ...entry, module: nextName }
          : entry
      )
    );
    if (selectedModule.toLowerCase() === oldName.toLowerCase()) {
      setSelectedModule(nextName);
    }
    setEditing(null);
    setEditedName("");
    setMsg(`Module renamed to “${nextName}”.`);

    await fetch("/api/modules/topics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldModule: oldName, module: nextName }),
    });
  }

  async function addTopic() {
    const trimmed = topicName.trim();
    if (!trimmed || !selectedModule) {
      setError("Select a module and enter a topic name.");
      return;
    }
    setSaving(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/modules/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: selectedModule, topic: trimmed }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add topic.");
      return;
    }
    setModuleTopics(Array.isArray(data) ? data : moduleTopics);
    setTopicName("");
    setMsg(`Topic “${trimmed}” added under ${selectedModule}.`);
  }

  async function removeTopic(module: string, topic: string) {
    const res = await fetch(`/api/modules/topics?module=${encodeURIComponent(module)}&topic=${encodeURIComponent(topic)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const data = await res.json();
    setModuleTopics(Array.isArray(data) ? data : moduleTopics);
    setMsg(`Topic “${topic}” removed from ${module}.`);
  }

  return (
    <div className="card">
      <div className="card-body">
        <h3 style={{ fontWeight: 800, marginBottom: ".35rem" }}>Modules & Topics</h3>
        <p className="text-muted" style={{ marginBottom: "1.25rem" }}>
          Admins set up each module and the topics that belong under it. Speakers use these topic groupings when they create or edit quizzes.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <form
          onSubmit={addCategory}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: ".75rem",
            alignItems: "flex-end",
            marginBottom: "1.5rem",
          }}
        >
          <div className="form-group" style={{ flex: "1 1 220px", marginBottom: 0 }}>
            <label className="form-label" htmlFor="new-category">
              New module
            </label>
            <input
              id="new-category"
              className="form-control"
              placeholder="e.g. Technology, Leadership"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>
          <button type="submit" className="btn btn-gold" disabled={saving} style={{ marginBottom: 0 }}>
            {saving ? "Adding…" : "+ Add Module"}
          </button>
        </form>

        {categories.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>
            No modules yet. Add one above so you can attach topics.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {categories.map((cat) => {
              const topics = moduleTopics.find((entry) => entry.module.toLowerCase() === cat.toLowerCase())?.topics ?? [];
              const selected = selectedModule.toLowerCase() === cat.toLowerCase();
              return (
                <div key={cat} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                    {editing === cat ? (
                      <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
                        <input className="form-control" value={editedName} onChange={(e) => setEditedName(e.target.value)} maxLength={80} autoFocus style={{ minWidth: 180, flex: 1 }} />
                        <button type="button" className="btn btn-gold btn-sm" onClick={() => renameCategory(cat)} disabled={saving}>Save</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setEditedName(""); }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedModule(cat)}
                        style={{
                          background: selected ? "var(--primary-light)" : "transparent",
                          color: selected ? "var(--primary-dark)" : "var(--gray-700)",
                          border: selected ? "1px solid var(--primary)" : "1px solid var(--border)",
                        }}
                      >
                        {cat}
                      </button>
                    )}

                    {editing !== cat && (
                      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditing(cat); setEditedName(cat); }}>Edit</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeCategory(cat)}>Remove</button>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: ".85rem" }}>
                    <div style={{ fontSize: ".75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--gray-500)", marginBottom: ".5rem" }}>
                      Topics under this module
                    </div>

                    {topics.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0 }}>No topics assigned yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                        {topics.map((topic) => (
                          <span key={`${cat}-${topic}`} className="badge badge-approved" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
                            {topic}
                            <button type="button" onClick={() => removeTopic(cat, topic)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontWeight: 700 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected && (
                    <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        className="form-control"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder="Add topic"
                        maxLength={80}
                        style={{ minWidth: 180, flex: 1 }}
                      />
                      <button type="button" className="btn btn-gold btn-sm" onClick={addTopic} disabled={saving}>
                        Add Topic
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
