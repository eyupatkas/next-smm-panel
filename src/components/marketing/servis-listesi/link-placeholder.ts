export function getLinkPlaceholder(platformName: string): string {
  const lower = platformName.toLowerCase();
  if (lower.includes("instagram"))
    return "https://instagram.com/kullanici-adi";
  if (lower.includes("tiktok"))
    return "https://www.tiktok.com/@kullanici-adi";
  if (lower.includes("youtube"))
    return "https://youtube.com/@kanal-adi";
  if (lower.includes("twitter") || lower.includes("x.com"))
    return "https://x.com/kullanici-adi";
  if (lower.includes("facebook"))
    return "https://facebook.com/kullanici-adi";
  if (lower.includes("telegram"))
    return "https://t.me/kullanici-adi";
  if (lower.includes("spotify"))
    return "https://open.spotify.com/track/...";
  if (lower.includes("twitch"))
    return "https://twitch.tv/kullanici-adi";
  if (lower.includes("discord"))
    return "https://discord.gg/davet-kodu";
  return "https://...";
}
