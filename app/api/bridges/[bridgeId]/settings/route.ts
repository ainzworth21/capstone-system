import { NextRequest, NextResponse } from "next/server";
import { findOne, readDB, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { Bridge, BridgeSettings, CertificateTemplate } from "@/lib/types";
import { generateId, now } from "@/lib/utils";

const CERTIFICATE_SECTIONS = ["participant_certificate", "speaker_certificate"] as const;
const SETTINGS_SECTIONS = ["pre_test", "post_test", ...CERTIFICATE_SECTIONS] as const;
type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

async function requireAdmin() {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bridgeId: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bridgeId } = await params;
  const bridge = findOne<Bridge>("bridges", (item) => item.id === bridgeId);
  if (!bridge) return NextResponse.json({ error: "Bridge not found." }, { status: 404 });

  const settings = findOne<BridgeSettings>("bridge_settings", (item) => item.bridge_id === bridgeId);
  return NextResponse.json(settings ?? {
    bridge_id: bridgeId,
    pre_test: null,
    post_test: null,
    participant_certificate: null,
    speaker_certificate: null,
    updated_at: "",
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bridgeId: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bridgeId } = await params;
  const bridge = findOne<Bridge>("bridges", (item) => item.id === bridgeId);
  if (!bridge) return NextResponse.json({ error: "Bridge not found." }, { status: 404 });

  const body = await request.json();
  const section = body.section as SettingsSection;
  if (!SETTINGS_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Invalid Bridge settings section." }, { status: 400 });
  }

  const settingsList = readDB<BridgeSettings>("bridge_settings");
  const index = settingsList.findIndex((item) => item.bridge_id === bridgeId);
  const current: BridgeSettings = settingsList[index] ?? {
    bridge_id: bridgeId,
    pre_test: null,
    post_test: null,
    participant_certificate: null,
    speaker_certificate: null,
    updated_at: now(),
  };
  const data = body.data ?? {};
  let updated: BridgeSettings;

  if (section === "pre_test") {
    updated = {
      ...current,
      pre_test: {
        id: current.pre_test?.id ?? generateId(),
        event_id: `bridge:${bridgeId}`,
        questions: (data.questions ?? []).filter((question: { question?: string }) => String(question.question ?? "").trim()),
        created_at: current.pre_test?.created_at ?? now(),
      },
      updated_at: now(),
    };
  } else if (section === "post_test") {
    updated = {
      ...current,
      post_test: {
        id: current.post_test?.id ?? generateId(),
        event_id: `bridge:${bridgeId}`,
        is_active: Boolean(data.is_active),
        questions: (data.questions ?? []).filter((question: { question?: string }) => String(question.question ?? "").trim()),
        created_at: current.post_test?.created_at ?? now(),
      },
      updated_at: now(),
    };
  } else {
    const template: Omit<CertificateTemplate, "event_id" | "recipient_type"> = {
      id: current[section]?.id ?? generateId(),
      image_filename: data.image_filename ?? current[section]?.image_filename ?? null,
      name_x: Number(data.name_x ?? current[section]?.name_x ?? 50),
      name_y: Number(data.name_y ?? current[section]?.name_y ?? 60),
      name_font_size: Number(data.name_font_size ?? current[section]?.name_font_size ?? 36),
      name_color: String(data.name_color ?? current[section]?.name_color ?? "#1a5c38"),
      name_font: String(data.name_font ?? current[section]?.name_font ?? "Georgia"),
      created_at: current[section]?.created_at ?? now(),
      updated_at: now(),
    };
    updated = { ...current, [section]: template, updated_at: now() };
  }

  if (index < 0) settingsList.push(updated);
  else settingsList[index] = updated;
  writeDB("bridge_settings", settingsList);
  return NextResponse.json(updated);
}
