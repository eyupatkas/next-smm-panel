/** Normalizes social-media links before they are sent to provider APIs. */
export function cleanOrderLink(link: string): string {
  try {
    const url = new URL(link.trim());
    const isYouTube = ["youtu.be", "youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname);

    if (isYouTube) {
      if (url.hostname === "youtu.be") {
        const videoId = url.pathname.slice(1).split("/")[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }

      ["si", "feature", "app", "pp", "ab_channel", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
        .forEach((parameter) => url.searchParams.delete(parameter));
      return url.toString();
    }

    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "si"]
      .forEach((parameter) => url.searchParams.delete(parameter));
    return url.toString();
  } catch {
    return link.trim();
  }
}

