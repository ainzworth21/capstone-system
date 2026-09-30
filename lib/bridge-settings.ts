import { findOne, getUniversalPreAssessment, getUniversalSurvey, readDB } from "./db";
import { getBridgeForEvent } from "./bridge";
import {
  Bridge,
  BridgeSettings,
  Event,
  PreAssessment,
  Survey,
} from "./types";

export function getBridgeSettings(bridgeId: string): BridgeSettings | null {
  return findOne<BridgeSettings>("bridge_settings", (settings) => settings.bridge_id === bridgeId);
}

export function getBridgeSettingsForEvent(eventId: string): BridgeSettings | null {
  const event = findOne<Event>("events", (item) => item.id === eventId);
  if (!event) return null;
  const bridge = getBridgeForEvent(event, readDB<Bridge>("bridges"));
  return bridge ? getBridgeSettings(bridge.id) : null;
}

export function getPreTestForEvent(eventId: string): PreAssessment | null {
  const event = findOne<Event>("events", (item) => item.id === eventId);
  if (!event) return null;
  const bridge = getBridgeForEvent(event, readDB<Bridge>("bridges"));
  if (bridge) {
    const settings = getBridgeSettings(bridge.id);
    const assessment = settings?.pre_test;
    if (!assessment) return null;
    const questions = (assessment.questions ?? []).filter((question) => question.question.trim());
    return questions.length ? { ...assessment, event_id: eventId, questions } : null;
  }
  return getUniversalPreAssessment();
}

export function getPostTestForEvent(eventId: string): Survey | null {
  const event = findOne<Event>("events", (item) => item.id === eventId);
  if (!event) return null;
  const bridge = getBridgeForEvent(event, readDB<Bridge>("bridges"));
  if (bridge) {
    const settings = getBridgeSettings(bridge.id);
    const survey = settings?.post_test;
    if (!survey) return null;
    return {
      ...survey,
      event_id: eventId,
      questions: (survey.questions ?? []).filter((question) => question.question.trim()),
    };
  }
  return getUniversalSurvey();
}