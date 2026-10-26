// Sağlayıcı API'si 'type' alanından gelen anlamsız kısa değerler
const GENERIC_DESCRIPTIONS = new Set([
  "default", "package", "custom comments", "subscriptions",
  "invites from groups", "custom comments package",
  "mentions user followers", "poll", "comment likes",
  "mentions custom list", "mentions hashtag",
]);

function normalizeLine(line: string) {
  return line.replace(/^[\s\-•*]+/, "").trim();
}

export function splitServiceDescription(description: string | null | undefined) {
  if (!description) {
    return { summary: null, bullets: [] as string[] };
  }

  // Generic / type-only değerler anlamsız; gösterme
  if (GENERIC_DESCRIPTIONS.has(description.trim().toLowerCase())) {
    return { summary: null, bullets: [] as string[] };
  }

  const lines = description
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);

  if (lines.length === 0) {
    return { summary: null, bullets: [] as string[] };
  }

  const [summary, ...rest] = lines;
  const bullets = rest.filter((line) => line.length > 0);
  return { summary, bullets };
}