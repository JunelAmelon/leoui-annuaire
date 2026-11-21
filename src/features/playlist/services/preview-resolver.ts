/**
 * Résout une URL d'extrait audio 30s (MP3/M4A) pour un morceau donné.
 * Spotify Web API ayant déprécié `preview_url` pour les applications récentes,
 * on s'appuie sur iTunes (URLs permanentes) puis Deezer (catalogue très large).
 */

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function primaryArtist(artist: string): string {
  return artist.split(',')[0]?.split('&')[0]?.trim() || artist;
}

function artistMatches(candidateArtist: string, targetArtist: string): boolean {
  const cand = normalize(candidateArtist);
  const target = normalize(primaryArtist(targetArtist));
  if (!cand || !target) return false;
  return cand.includes(target) || target.includes(cand);
}

function titleMatches(candidateTitle: string, targetTitle: string): boolean {
  const cand = normalize(candidateTitle);
  const target = normalize(targetTitle);
  if (!cand || !target) return false;
  return cand.includes(target) || target.includes(cand);
}

async function fetchWithTimeout(url: string, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

async function searchItunesPreview(title: string, artist: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${primaryArtist(artist)} ${title}`.trim());
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/search?term=${q}&media=music&entity=song&country=FR&limit=5`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const match = results.find(
      (r: any) =>
        r?.previewUrl &&
        artistMatches(String(r.artistName ?? ''), artist) &&
        titleMatches(String(r.trackName ?? ''), title)
    );
    return match?.previewUrl ? String(match.previewUrl) : null;
  } catch {
    return null;
  }
}

async function searchDeezerPreview(title: string, artist: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${primaryArtist(artist)} ${title}`.trim());
    const res = await fetchWithTimeout(
      `https://api.deezer.com/search?q=${q}&limit=5`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.data) ? data.data : [];

    // 1. Correspondance exacte artiste + titre
    const exact = results.find(
      (r: any) =>
        r?.preview &&
        artistMatches(String(r.artist?.name ?? ''), artist) &&
        titleMatches(String(r.title ?? ''), title)
    );
    if (exact?.preview) return String(exact.preview);

    // 2. Correspondance titre seul si le premier résultat a un preview
    const byTitle = results.find(
      (r: any) => r?.preview && titleMatches(String(r.title ?? ''), title)
    );
    return byTitle?.preview ? String(byTitle.preview) : null;
  } catch {
    return null;
  }
}

export async function resolveTrackPreviewUrl(
  title: string,
  artist: string
): Promise<string | null> {
  if (!title.trim()) return null;

  // Lancer iTunes (URL permanente) et Deezer (catalogue FR/rap très complet) en parallèle
  const [itunesUrl, deezerUrl] = await Promise.all([
    searchItunesPreview(title, artist),
    searchDeezerPreview(title, artist),
  ]);

  return itunesUrl || deezerUrl || null;
}
