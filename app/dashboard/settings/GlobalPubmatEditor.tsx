"use client";

import { useRef, useState } from "react";
import { Pubmat } from "@/lib/types";

export default function GlobalPubmatEditor({
  initialItems,
}: {
  initialItems: Pubmat[];
}) {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/pubmat/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setMsg(data.error || "Upload failed.");
      return;
    }
    setFilename(data.filename);
    setPreview(`/pubmats/${data.filename}`);
    setMsg("Image uploaded.");
  }

  function resetForm() {
    setTitle("");
    setCaption("");
    setFilename(null);
    setPreview(null);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function addPubmat() {
    if (!filename) {
      setMsg("Upload an announcement image first.");
      return;
    }
    setSaving(true);
    setMsg("");

    const payload = {
      title,
      caption,
      image_filename: filename,
      is_active: true,
    };

    const res = await fetch("/api/settings/pubmat", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId
          ? { id: editingId, ...payload }
          : payload
      ),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Failed to save.");
      return;
    }

    if (editingId) {
      setItems((list) => list.map((p) => (p.id === editingId ? data : p)));
      setMsg("Announcement updated.");
    } else {
      setItems((list) => [...list, data]);
      setMsg("Announcement added. It will appear on the landing page Announcement tab.");
    }
    resetForm();
  }

  function startEdit(item: Pubmat) {
    setEditingId(item.id);
    setTitle(item.title);
    setCaption(item.caption ?? "");
    setFilename(item.image_filename);
    setPreview(`/pubmats/${item.image_filename}`);
  }

  async function toggleActive(item: Pubmat) {
    const res = await fetch("/api/settings/pubmat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setItems((list) => list.map((p) => (p.id === item.id ? updated : p)));
  }

  async function remove(item: Pubmat) {
    if (!confirm(`Remove announcement "${item.title}"?`)) return;
    const res = await fetch(
      `/api/settings/pubmat?id=${encodeURIComponent(item.id)}`,
      { method: "DELETE" }
    );
    if (!res.ok) return;
    setItems((list) => list.filter((p) => p.id !== item.id));
  }

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Landing Page Announcements</h3>
        <p className="text-muted" style={{ fontSize: ".875rem", marginTop: ".375rem" }}>
          Upload publicity materials shown on the home page under the{" "}
          <strong>Announcement</strong> tab.
        </p>
      </div>

      {msg && (
        <div
          className={`alert alert-${msg.toLowerCase().includes("fail") ? "error" : "success"}`}
          style={{ marginBottom: "1rem" }}
        >
          {msg}
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Upload New Announcement</h3>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-control"
                placeholder="e.g. COIL Webinar Series Poster"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Caption (optional)</label>
              <input
                className="form-control"
                placeholder="Short description"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Image *</label>
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadImage}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Upload Image"}
              </button>
              {filename && (
                <span className="text-muted" style={{ fontSize: ".8125rem" }}>
                  <code>{filename}</code>
                </span>
              )}
            </div>
            {preview && (
              <div style={{ marginTop: "1rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Announcement preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 320,
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-gold"
            onClick={addPubmat}
            disabled={saving || !filename}
          >
            {saving ? "Saving…" : editingId ? "Update Announcement" : "Add to Landing Page"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
              style={{ marginLeft: ".5rem" }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Current Announcements ({items.length})</h3>
        </div>
        <div className="card-body" style={{ padding: items.length ? 0 : undefined }}>
          {items.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>
              No announcements yet. Upload one above.
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/pubmats/${item.image_filename}`}
                          alt={item.title}
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{item.title}</div>
                        {item.caption && (
                          <div className="text-muted" style={{ fontSize: ".8125rem" }}>
                            {item.caption}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${item.is_active ? "badge-upcoming" : "badge-cancelled"}`}
                        >
                          {item.is_active ? "Visible" : "Hidden"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => toggleActive(item)}
                          >
                            {item.is_active ? "Hide" : "Show"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => remove(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
