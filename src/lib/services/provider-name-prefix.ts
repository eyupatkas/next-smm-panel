export function normalizeNamePrefix(prefix: FormDataEntryValue | string | null | undefined) {
  return String(prefix ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function applyNamePrefix(name: string, prefix: string | null | undefined) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const cleanPrefix = normalizeNamePrefix(prefix);

  if (!cleanPrefix || !cleanName) return cleanName;
  if (cleanName.toLocaleLowerCase("tr").startsWith(cleanPrefix.toLocaleLowerCase("tr"))) {
    return cleanName;
  }

  return `${cleanPrefix} ${cleanName}`.trim();
}

export function replaceNamePrefix(name: string, oldPrefix: string | null | undefined, newPrefix: string | null | undefined) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const cleanOldPrefix = normalizeNamePrefix(oldPrefix);
  const cleanNewPrefix = normalizeNamePrefix(newPrefix);
  const withoutOldPrefix = cleanOldPrefix && cleanName.toLocaleLowerCase("tr").startsWith(cleanOldPrefix.toLocaleLowerCase("tr"))
    ? cleanName.slice(cleanOldPrefix.length).trim()
    : cleanName;

  return applyNamePrefix(withoutOldPrefix, cleanNewPrefix);
}
