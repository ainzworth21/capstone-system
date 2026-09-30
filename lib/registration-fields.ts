export const DESIGNATIONS = [
  "Faculty",
  "Non-Academic Staff",
  "Others",
  "Staff",
  "Student",
  "Support Staff",
] as const;

export const NAME_PREFIXES = [
  "Mr.",
  "Ms.",
  "Mrs.",
  "Miss",
  "Dr.",
  "Prof.",
  "Engr.",
  "Atty.",
  "Rev.",
] as const;

/** Generational / name endings (after last name) */
export const NAME_SUFFIXES = [
  "Jr.",
  "Sr.",
  "II",
  "III",
  "IV",
  "V",
] as const;

export type NameParts = {
  name_prefix?: string | null;
  first_name?: string | null;
  middle_initial?: string | null;
  last_name?: string | null;
  name_suffix?: string | null;
};

/** Build display name: "Mr. Juan A. dela Cruz Jr." */
export function composeFullName(parts: NameParts & { full_name?: string | null }): string {
  const prefix = (parts.name_prefix ?? "").trim();
  const first = (parts.first_name ?? "").trim();
  const mi = (parts.middle_initial ?? "").trim().replace(/\.$/, "");
  const last = (parts.last_name ?? "").trim();
  const suffix = (parts.name_suffix ?? "").trim();

  if (!first && !last) {
    return (parts.full_name ?? "").trim();
  }

  const middle = mi ? `${mi}.` : "";
  const core = [first, middle, last].filter(Boolean).join(" ");
  const withSuffix = [core, suffix].filter(Boolean).join(" ");
  return [prefix, withSuffix].filter(Boolean).join(" ").trim();
}

export function normalizeNameParts(input: NameParts) {
  const name_prefix = (input.name_prefix ?? "").trim();
  const first_name = (input.first_name ?? "").trim();
  let middle_initial = (input.middle_initial ?? "").trim().replace(/\./g, "");
  if (middle_initial.length > 1) middle_initial = middle_initial.charAt(0);
  middle_initial = middle_initial.toUpperCase();
  const last_name = (input.last_name ?? "").trim();
  const name_suffix = (input.name_suffix ?? "").trim();
  return {
    name_prefix,
    first_name,
    middle_initial,
    last_name,
    name_suffix,
    full_name: composeFullName({
      name_prefix,
      first_name,
      middle_initial,
      last_name,
      name_suffix,
    }),
  };
}

export const COMMON_INSTITUTIONS = [
  "CvSU",
  "UiTM",
  "Cavite State University",
  "Universiti Teknologi MARA",
] as const;

export const COMMON_ORGANIZATIONS = [
  "Cavite State University - Main Campus",
  "Cavite State University - Don Severino de las Alas Campus",
  "Cavite State University - Indang Campus",
  "Cavite State University - Bacoor City Campus",
  "Cavite State University - Carmona Campus",
  "Cavite State University - Cavite City Campus",
  "Cavite State University - General Trias City Campus",
  "Cavite State University - Imus City Campus",
  "Cavite State University - Naic Campus",
  "Cavite State University - Silang Campus",
  "Cavite State University - Tanza Campus",
  "Cavite State University - Trece Martires City Campus",
  "UiTM",
  "CvSU",
] as const;

export const COMMON_COUNTRIES = [
  "Philippines",
  "Malaysia",
  "Indonesia",
  "Singapore",
  "Thailand",
  "Others",
] as const;

export function normalizeParticipantDemographics(p: {
  age?: number | null;
  organization?: string;
  designation?: string;
  country?: string;
  institution?: string;
}) {
  return {
    age: typeof p.age === "number" && !Number.isNaN(p.age) ? p.age : null,
    organization: p.organization?.trim() || "",
    designation: p.designation?.trim() || "",
    country: p.country?.trim() || "",
    institution: p.institution?.trim() || "",
  };
}

/** Format as YYYY-MM-DD HH:MM:SS (local) */
export function formatCompletedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
