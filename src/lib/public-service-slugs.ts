export function publicSlugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function publicCategorySegment(category: { id: string; name: string; slug?: string | null }) {
  return category.slug || `${publicSlugify(category.name)}-${category.id}`;
}

export function publicServiceSegment(service: { id: string; name: string; slug?: string | null }) {
  return service.slug || `${publicSlugify(service.name)}-${service.id}`;
}

export function idFromPublicSegment(segment: string) {
  const lastDash = segment.lastIndexOf("-");
  return lastDash >= 0 ? segment.slice(lastDash + 1) : segment;
}
