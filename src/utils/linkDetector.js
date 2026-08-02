const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Figures out what kind of link was pasted.
 * Returns { type: 'youtube', videoId } or { type: 'audio' }.
 * "audio" covers any direct link — mp3, wav, a CDN link, an internet
 * radio stream, etc. — anything the <audio> tag can be pointed at.
 */
export function detectLink(rawUrl) {
  const url = rawUrl.trim();
  const ytMatch = url.match(YT_REGEX);
  if (ytMatch) {
    return { type: 'youtube', videoId: ytMatch[1], url };
  }
  return { type: 'audio', videoId: null, url };
}

/** Best-effort filename guess for direct audio links, used as a fallback title. */
export function guessTitleFromUrl(url) {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split('/').filter(Boolean).pop();
    if (!last) return url;
    return decodeURIComponent(last.replace(/\.[a-zA-Z0-9]+$/, '')).replace(/[-_]+/g, ' ');
  } catch {
    return url;
  }
}

/** Fetches a YouTube video's title via the public oEmbed endpoint (no API key needed). */
export async function fetchYouTubeTitle(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) throw new Error('oEmbed request failed');
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}
