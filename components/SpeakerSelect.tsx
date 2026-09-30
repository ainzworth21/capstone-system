"use client";

import { useEffect, useState } from "react";

export interface SpeakerOption {
  id: string;
  full_name: string;
  title_position: string;
  affiliation: string;
  speaker_active: boolean;
  email?: string;
}

interface Props {
  /** Selected speaker user ids (order = lead first). */
  valueIds: string[];
  onChange: (speakerIds: string[], displayName: string) => void;
  required?: boolean;
}

function labelFor(sp: SpeakerOption): string {
  return (
    [sp.full_name, sp.title_position, sp.affiliation].filter(Boolean).join(", ") ||
    sp.full_name
  );
}

function optionLabel(sp: SpeakerOption): string {
  const bits = [sp.full_name];
  if (sp.title_position) bits.push(sp.title_position);
  if (sp.affiliation) bits.push(`(${sp.affiliation})`);
  return bits.join(" — ");
}

export function SpeakerSelect({
  valueIds,
  onChange,
  required = true,
}: Props) {
  const [speakers, setSpeakers] = useState<SpeakerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftRow, setDraftRow] = useState(false);

  useEffect(() => {
    fetch("/api/speakers")
      .then((r) => r.json())
      .then((data: SpeakerOption[]) => {
        setSpeakers(Array.isArray(data) ? data : []);
      })
      .catch(() => setSpeakers([]))
      .finally(() => setLoading(false));
  }, []);

  function emit(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    const names = unique.map((id) => {
      const sp = speakers.find((s) => s.id === id);
      return sp ? labelFor(sp) : id;
    });
    onChange(unique, names.join(" · "));
  }

  const rows: string[] =
    valueIds.length === 0
      ? [""]
      : draftRow
        ? [...valueIds, ""]
        : valueIds;

  function setRow(index: number, nextId: string) {
    const next = [...rows];
    next[index] = nextId;
    setDraftRow(false);
    emit(next.filter(Boolean));
  }

  function removeRow(index: number) {
    if (draftRow && index === rows.length - 1 && !rows[index]) {
      setDraftRow(false);
      return;
    }
    emit(valueIds.filter((_, i) => i !== index));
  }

  function optionsForRow(index: number) {
    const current = rows[index] || "";
    const taken = new Set(rows.filter((id, i) => id && i !== index));
    return speakers.filter((s) => s.id === current || !taken.has(s.id));
  }

  const canAddAnother =
    speakers.length > valueIds.length &&
    valueIds.length > 0 &&
    !draftRow &&
    valueIds.every(Boolean);

  return (
    <div className="form-group">
      <label className="form-label">Speakers / Resource Persons *</label>
      <div className="form-hint" style={{ marginBottom: ".5rem" }}>
        First dropdown is the lead. Use “Add another speaker” for co-speakers.
        Each is auto-registered on the roster and can edit the shared quiz.
      </div>

      {loading ? (
        <p className="text-muted" style={{ fontSize: ".875rem" }}>
          Loading speakers…
        </p>
      ) : speakers.length === 0 ? (
        <p className="text-muted" style={{ margin: 0, fontSize: ".875rem" }}>
          No speakers yet. Register speakers from Users → Register speaker,
          then return here.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
          {rows.map((id, index) => (
            <div
              key={`speaker-row-${index}-${id || "empty"}`}
              style={{
                display: "flex",
                gap: ".5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                className="form-control"
                style={{ flex: "1 1 220px", minWidth: 0 }}
                value={id}
                required={required && index === 0}
                onChange={(e) => setRow(index, e.target.value)}
              >
                <option value="">
                  {index === 0 ? "Select lead speaker…" : "Select speaker…"}
                </option>
                {optionsForRow(index).map((s) => (
                  <option key={s.id} value={s.id}>
                    {optionLabel(s)}
                  </option>
                ))}
              </select>
              {index === 0 ? (
                <span
                  className="badge badge-approved"
                  style={{ fontSize: ".7rem", flexShrink: 0 }}
                >
                  Lead
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => removeRow(index)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {canAddAnother && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: "flex-start" }}
              onClick={() => setDraftRow(true)}
            >
              + Add another speaker
            </button>
          )}
        </div>
      )}

      {required && (
        <input
          type="text"
          value={valueIds.join(",")}
          required={valueIds.length === 0}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden
          style={{
            opacity: 0,
            height: 0,
            width: 0,
            position: "absolute",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
