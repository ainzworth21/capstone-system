export interface ModuleTopicEntry {
  module: string;
  topics: string[];
}

export function normalizeTopics(topics: string[]): string[] {
  return [...new Set((topics ?? []).map((t) => t.trim()).filter(Boolean))];
}

export function mergeModuleTopics(
  entries: ModuleTopicEntry[] | null | undefined,
  module: string,
  topic: string
): ModuleTopicEntry[] {
  const cleanModule = module.trim();
  const cleanTopic = topic.trim();
  if (!cleanModule || !cleanTopic) return entries ?? [];

  const next = (entries ?? []).map((entry) => ({
    module: entry.module,
    topics: normalizeTopics(entry.topics),
  }));

  const match = next.find((entry) => entry.module.toLowerCase() === cleanModule.toLowerCase());
  if (match) {
    match.topics = normalizeTopics([...match.topics, cleanTopic]);
    return next;
  }

  next.push({ module: cleanModule, topics: [cleanTopic] });
  return next;
}

export function removeTopicFromModule(
  entries: ModuleTopicEntry[] | null | undefined,
  module: string,
  topic: string
): ModuleTopicEntry[] {
  const cleanModule = module.trim();
  const cleanTopic = topic.trim();
  if (!cleanModule || !cleanTopic) return entries ?? [];

  return (entries ?? [])
    .map((entry) => ({
      module: entry.module,
      topics: normalizeTopics(entry.topics).filter((t) => t.toLowerCase() !== cleanTopic.toLowerCase()),
    }))
    .filter((entry) => entry.module.toLowerCase() !== cleanModule.toLowerCase() || entry.topics.length > 0);
}

export function getTopicsForModule(entries: ModuleTopicEntry[] | null | undefined, module: string): string[] {
  const cleanModule = module.trim();
  if (!cleanModule) return [];

  return (
    (entries ?? []).find((entry) => entry.module.toLowerCase() === cleanModule.toLowerCase())?.topics ?? []
  );
}
