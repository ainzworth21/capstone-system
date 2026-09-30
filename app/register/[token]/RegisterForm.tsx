"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Event } from "@/lib/types";
import {
  DESIGNATIONS,
  NAME_SUFFIXES,
  COMMON_ORGANIZATIONS,
  COMMON_COUNTRIES,
  COMMON_INSTITUTIONS,
} from "@/lib/registration-fields";

interface Props {
  event: Event;
  isFull: boolean;
  prefill: {
    first_name: string;
    middle_initial: string;
    last_name: string;
    name_suffix: string;
    email: string;
    student_id: string;
    course: string;
    year_level: string;
    designation: string;
  } | null;
  isLoggedIn: boolean;
}

export default function RegisterForm({ event, isFull, prefill, isLoggedIn }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: prefill?.first_name ?? "",
    middle_initial: prefill?.middle_initial ?? "",
    last_name: prefill?.last_name ?? "",
    name_suffix: prefill?.name_suffix ?? "",
    student_id: prefill?.student_id ?? "",
    email: prefill?.email ?? "",
    course: prefill?.course ?? "",
    year_level: prefill?.year_level ?? "",
    age: "",
    organization: "",
    designation: prefill?.designation ?? "",
    country: "Philippines",
    institution: "CvSU",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_token: event.registration_token, ...form }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }

    if (data.has_pre_assessment) {
      router.push(
        `/pre-assessment/${data.event.id}?participant_id=${data.participant.id}`
      );
    } else {
      router.push(`/confirmation?pid=${data.participant.id}`);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>{isFull ? "Join Waitlist" : "Register for this Event"}</h3>
      </div>
      <div className="card-body">
        {isFull && (
          <div className="alert alert-warning">
            This event is at full capacity. You can join the waitlist.
          </div>
        )}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                className="form-control"
                placeholder="Juan"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                className="form-control"
                placeholder="dela Cruz"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Middle Initial</label>
              <input
                className="form-control"
                placeholder="A"
                maxLength={1}
                value={form.middle_initial}
                onChange={(e) =>
                  set("middle_initial", e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 1))
                }
                style={{ textTransform: "uppercase", maxWidth: 80 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Suffix</label>
              <select
                className="form-control"
                value={form.name_suffix}
                onChange={(e) => set("name_suffix", e.target.value)}
              >
                <option value="">—</option>
                {NAME_SUFFIXES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="form-hint">Jr., Sr., II, III…</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ID Number *</label>
            <input
              className="form-control"
              placeholder="e.g. 2021-00001"
              value={form.student_id}
              onChange={(e) => set("student_id", e.target.value)}
              required
            />
            <div className="form-hint">
              Student, staff, or employee ID from your institution.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              readOnly={isLoggedIn && !!prefill?.email}
              style={
                isLoggedIn && prefill?.email
                  ? { background: "var(--gray-100)", cursor: "not-allowed" }
                  : {}
              }
              required
            />
            <div className="form-hint">
              {isLoggedIn && prefill?.email
                ? "Using your account email."
                : "Confirmation will be sent here."}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age *</label>
              <input
                type="number"
                min={10}
                max={100}
                className="form-control"
                placeholder="e.g. 20"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Designation *</label>
              <select
                className="form-control"
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                required
              >
                <option value="" disabled>
                  Select designation
                </option>
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="form-hint">
                Faculty, staff, student, or other — choose what best fits you.
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Organization *</label>
            <input
              className="form-control"
              list="org-list"
              placeholder="e.g. Cavite State University - Main Campus"
              value={form.organization}
              onChange={(e) => set("organization", e.target.value)}
              required
            />
            <datalist id="org-list">
              {COMMON_ORGANIZATIONS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Country *</label>
              <input
                className="form-control"
                list="country-list"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                required
              />
              <datalist id="country-list">
                {COMMON_COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Institution *</label>
              <input
                className="form-control"
                list="institution-list"
                placeholder="e.g. CvSU, UiTM, or your university"
                value={form.institution}
                onChange={(e) => set("institution", e.target.value)}
                required
              />
              <datalist id="institution-list">
                {COMMON_INSTITUTIONS.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
              <div className="form-hint">
                Your home university or partner institution (same style as Organization).
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Course / Program</label>
              <input
                className="form-control"
                placeholder="e.g. BSIT (or N/A if not a student)"
                value={form.course}
                onChange={(e) => set("course", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Year Level</label>
              <select
                className="form-control"
                value={form.year_level}
                onChange={(e) => set("year_level", e.target.value)}
                required
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y}
                    {["st", "nd", "rd", "th", "th"][y - 1]} Year
                  </option>
                ))}
                <option value="0">N/A (Faculty / Staff / Others)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn ${isFull ? "btn-secondary" : "btn-gold"} btn-block btn-lg`}
          >
            {loading
              ? "Submitting…"
              : isFull
                ? "Join Waitlist"
                : "Confirm Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
